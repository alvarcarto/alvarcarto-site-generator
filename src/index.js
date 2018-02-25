const fs = require('fs');
const path = require('path');
const URL = require('url-parse');
const BPromise = require('bluebird');
const request = require('request-promise');
const confirm = require('inquirer-confirm');
const klaw = require('klaw');
const _ = require('lodash');
const chalk = require('chalk');
const scrape = require('website-scraper');
const blc = require('broken-link-checker');
const { stripIndent } = require('common-tags');
const fse = require('fs-extra');
const cliParser = require('./cli-parser');
const manualUrls = require('./manual-urls');
const transforms = require('./transforms');

BPromise.promisifyAll(fs);
BPromise.config({
  longStackTraces: true,
});

// Site will be first built here, and then copied to the output directory
const TEMP_DIR = '.tmp';

function main(opts) {
  const crawlManualUrls = _.filter(manualUrls, m => m.crawl);

  const scrapeOpts = {
    urls: [opts.url].concat(_.map(crawlManualUrls, m => new URL(m.urlPath, opts.url))),
    directory: TEMP_DIR,
    recursive: true,
    filenameGenerator: 'bySiteStructure',
    urlFilter: url =>
      new URL(url).hostname.toLowerCase() === new URL(opts.url).hostname.toLowerCase(),
    prettifyUrls: true,
    requestConcurrency: opts.concurrency,
  };

  const tempDir = path.join(__dirname, '..', TEMP_DIR);

  function log(...args) {
    if (opts.verbose) {
      console.log.apply(this, args);
    }
  }

  console.log(stripIndent`Going to do the following:

    * Remove contents of ${opts.outputDir} directory
  `);
  console.log('');

  return BPromise.resolve(confirm('Proceed?'))
    .tap(() => log(`\nRemoving ${tempDir} ..`))
    .then(() => fse.remove(tempDir))
    .tap(() => log(`Removing existing contents from ${opts.outputDir} ..`))
    .then(() => removeAllInside(opts.outputDir))
    .tap(() => {
      if (opts.checkBrokenLinks) {
        log(`Checking ${opts.url} for broken links ..\n`);
        return logBrokenLinks(opts);
      }

      log('Skip broken links checking.');
      return BPromise.resolve();
    })
    .tap(() => log(`Scraping ${scrapeOpts.urls.join(', ')} ..`))
    .then(() => scrape(scrapeOpts))
    .then((result) => {
      const siteDirName = result[0].filename.split('/')[0];
      const siteDirPath = path.join(tempDir, siteDirName);

      return moveAllInside(siteDirPath, tempDir)
        .then(() => fse.remove(siteDirPath));
    })
    .then(() => {
      const filteredUrls = _.filter(manualUrls, m => !m.crawl);

      log(`Manually downloading ${filteredUrls.length} urls ..`)
      return BPromise.each(filteredUrls, (manual) => {
        const fullUrl = new URL(manual.urlPath, opts.url);
        console.log(`Downloading ${fullUrl} -> ${TEMP_DIR}/${manual.filePath} ..`);

        return download(fullUrl, path.join(tempDir, manual.filePath))
          .tap((res) => {
            if (res.statusCode < 200) {
              console.warn(`Non-200 status code returned: ${res.statusCode}`);
            } else if (res.statusCode > 200 && res.statusCode < 500) {
              console.warn(`Non-200 status code returned: ${res.statusCode}`);
            } else if (res.statusCode > 500) {
              console.error(`ERROR! Status code returned: ${res.statusCode}`);
            }
          });
      });
    })
    .tap(() => log(`Copying everything from files/* to ${tempDir} ..`))
    .then(() => fse.copy(path.join(__dirname, '../files'), tempDir, { overwrite: false, errorOnExist: true }))
    .tap(() => log('Executing transforms ..'))
    .then(() => getDirTree(tempDir))
    .then(filePaths => BPromise.each(transforms, (transform) => {
      console.log(`Excuting ${transform.name} transform for ${filePaths.length} files ..`);

      const errors = [];

      return BPromise.each(filePaths, (absFilePath) => {
        const relativePath = path.relative(tempDir, absFilePath);

        return fs.readFileAsync(absFilePath, { encoding: null })
          .then((fileContent) => {
            return transform.transform(relativePath, fileContent, opts);
          })
          .then((result) => {
            if (result instanceof Error) {
              errors.push(result);
              return '';
            }

            if (_.isString(result)) {
              return fs.writeFileAsync(absFilePath, result, { encoding: 'utf8' });
            }

            // Assuming buffer
            return fs.writeFileAsync(absFilePath, result, { encoding: null });
          })
          .tap(() => BPromise.delay(transform.delay || 0));
      })
        .tap(() => {
          if (errors.length > 0 && opts.abortOnErrors) {
            console.error('\n\nBuild failed to errors!\n');
            throw new Error(`Build failure at ${transform.name} step`);
          }
        });
    }))
    .tap(() => log(`Copy ${TEMP_DIR} contents to ${opts.outputDir} ..`))
    .then(() => fse.copy(tempDir, opts.outputDir, { overwrite: false, errorOnExist: true }))
    .tap(() => console.log(`\nDone. Files written to ${opts.outputDir}`))
    .catch((err) => {
      throw err;
    });
}

function logBrokenLinks(opts) {
  return new BPromise((resolve, reject) => {
    // Recursively scans (crawls) the HTML content at each queued URL to find broken links.
    const siteChecker = new blc.SiteChecker({
      cacheResponses: false,
      // Check everything
      filterLevel: 3,
      honorRobotExclusions: false,
    }, {
      link: (result) => {
        // Linkedin doesn't allow scrapers, so omit
        if (result.broken && result.url.original.indexOf('linkedin') === -1) {
          const original = chalk.gray(`${result.base.original}`);
          console.log(`${chalk.red('BROKEN')} ${original} -> ${chalk.bold(result.url.original)}`);
        }
      },
      page: (err, pageUrl) => {
        if (err) {
          console.error(`Error checking page ${pageUrl}: ${err}`);
        } else {
          console.log(chalk.gray(`Checked ${pageUrl}`));
        }
      },
      site: (err) => {
        if (err) {
          reject(err);
        }
      },
      end: () => resolve(),
    });

    const checkUrls = _.filter(manualUrls, m => m.checkBrokenLinks);
    const arr = [opts.url].concat(_.map(checkUrls, manual => new URL(manual.urlPath, opts.url)));
    _.forEach(arr, u => siteChecker.enqueue(u));
  });
}

function download(url, relativePath) {
  return BPromise.resolve(request({
    url,
    simple: false,
    encoding: null,
    resolveWithFullResponse: true,
  }))
    .tap((res) => {
      return saveFile(relativePath, res.body);
    })
    .catch((err) => {
      console.error(`Error saving ${url}`);
      console.error(err);
    });
}

function saveFile(relativePath, data) {
  return fse.ensureDir(path.dirname(relativePath))
    .then(() => fs.writeFileAsync(relativePath, data, { encoding: null }));
}

// Get whole directory tree as flat list. Memory is not a problem here
function getDirTree(dir) {
  // files, directories, symlinks, etc
  const items = [];

  return new BPromise((resolve, reject) => {
    klaw(dir)
      .on('data', item => items.push(item.path))
      .on('error', err => reject(err))
      .on('end', () => {
        resolve(items);
      });
  })
    .then((paths) => {
      return BPromise.filter(paths, (p) => {
        return fs.lstatAsync(p)
          .then(stat => stat.isFile());
      });
    });
}

// mv src/* dst
// Moves contents of dir to `dst` but not the dir itself. Omits dotfiles and dirs.
function moveAllInside(src, dst, _opts) {
  const opts = _.merge({
    filter: filePath => !_.startsWith(path.basename(filePath), '.'),
  }, _opts);

  return fs.readdirAsync(src)
    .then((files) => {
      return BPromise.map(files, (name) => {
        const fullPath = path.join(src, name);

        if (opts.filter(fullPath)) {
          return fse.move(fullPath, path.join(dst, name));
        }

        return BPromise.resolve();
      });
    })
    .catch((err) => {
      if (err.code === 'ENOENT') {
        return;
      }

      throw err;
    });
}

// rm src/*
// Removes contents of a dir but not the dir itself. Omits dotfiles and dirs.
function removeAllInside(src, _opts) {
  const opts = _.merge({
    filter: filePath => !_.startsWith(path.basename(filePath), '.'),
  }, _opts);

  return fs.readdirAsync(src)
    .then((files) => {
      return BPromise.map(files, (name) => {
        const fullPath = path.join(src, name);

        if (opts.filter(fullPath)) {
          return fse.remove(fullPath);
        }

        return BPromise.resolve();
      });
    })
    .catch((err) => {
      if (err.code === 'ENOENT') {
        return;
      }

      throw err;
    });
}

if (require.main === module) {
  let opts;
  try {
    opts = cliParser.getOpts();
  } catch (err) {
    if (err.argumentError) {
      console.error(err.message);
      process.exit(1);
    }

    throw err;
  }

  main(opts)
    .catch((err) => {
      if (!err) {
        return;
      }

      throw err;
    });
}
