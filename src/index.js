const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const BPromise = require('bluebird');
const request = require('request-promise');
const confirm = require('inquirer-confirm');
const _ = require('lodash');
const scrape = require('website-scraper');
const { stripIndent } = require('common-tags');
const fse = require('fs-extra');
const cliParser = require('./cli-parser');
const manualUrls = require('./manual-urls');

BPromise.promisifyAll(fs);
BPromise.config({
  longStackTraces: true,
});

// Site will be first built here, and then copied to the output directory
const TEMP_DIR = '.tmp';

function main(opts) {
  const scrapeOpts = {
    urls: [opts.url],
    directory: TEMP_DIR,
    recursive: true,
    filenameGenerator: 'bySiteStructure',
    urlFilter: url => new URL(url).hostname.toLowerCase() === new URL(opts.url).hostname.toLowerCase(),
    prettifyUrls: true,
    requestConcurrency: opts.concurrency,
  };

  const buildDir = path.join(__dirname, '..', TEMP_DIR);
  
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
    .tap(() => log(`\nRemoving ${buildDir} ..`))
    .then(() => fse.remove(buildDir))
    .tap(() => log(`Scraping ${opts.url} ..`))
    .then(() => scrape(scrapeOpts))
    .then((result) => {
      const siteDirName = result[0].filename.split('/')[0];
      const siteDirPath = path.join(buildDir, siteDirName);

      return moveAllInside(siteDirPath, buildDir)
        .then(() => fse.remove(siteDirPath));
    })
    .tap(() => log(`Manually downloading ${manualUrls.length} urls ..`))
    .then(() => BPromise.each(manualUrls, manual => {
      const fullUrl = new URL(manual.urlPath, opts.url);
      console.log(`Downloading ${fullUrl} -> ${TEMP_DIR}/${manual.filePath} ..`);

      return download(fullUrl, path.join(buildDir, manual.filePath))
        .tap((res) => {
          if (res.statusCode < 200) {
            console.warn(`Non-200 status code returned: ${res.statusCode}`);
          } else if (res.statusCode > 200 && res.statusCode < 500) {
            console.warn(`Non-200 status code returned: ${res.statusCode}`);
          } else if (res.statusCode > 500) {
            console.error(`ERROR! Status code returned: ${res.statusCode}`);
          }
        });
    }))
    .tap(() => log(`Copying everything from files/* to build dir ..`))
    .then(() => fse.copy(path.join(__dirname, '../files'), buildDir, { overwrite: false, errorOnExist: true }))
    .tap(() => log(`Removing existing contents from ${opts.outputDir} ..`))
    .then(() => removeAllInside(opts.outputDir))
    .tap(() => log(`Copy build directory contents to ${opts.outputDir} ..`))
    .then(() => fse.copy(buildDir, opts.outputDir, { overwrite: false, errorOnExist: true }))
    .tap(() => console.log(`\nDone. Files written to ${opts.outputDir}`))
    .catch((err) => {
      throw err;
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
    .catch(err => {
      console.error(`Error saving ${url}`);
      console.error(err);
      return;
    });
}

function saveFile(relativePath, data) {
  return fse.ensureDir(path.dirname(relativePath))
    .then(() => fs.writeFileAsync(relativePath, data, { encoding: null }));
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
      });
    })
    .catch(err => {
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
      });
    })
    .catch(err => {
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
