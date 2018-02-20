const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const BPromise = require('bluebird');
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

const BUILD_DIR = 'build';

function main(opts) {
  const manualFullUrls = _.map(manualUrls, u => new URL(u, opts.url));
  const scrapeOpts = {
    urls: [opts.url].concat(manualFullUrls),
    directory: BUILD_DIR,
    recursive: true,
    filenameGenerator: 'bySiteStructure',
    urlFilter: url => new URL(url).hostname.toLowerCase() === new URL(opts.url).hostname.toLowerCase(),
    prettifyUrls: true,
    requestConcurrency: opts.concurrency,
  };

  const buildDir = path.join(__dirname, '..', BUILD_DIR);
  
  function log(...args) {
    if (opts.verbose) {
      console.log.apply(this, args);
    }
  }
  
  console.log(stripIndent`Going to do the following:

    * Remove ./${BUILD_DIR} directory
    * Remove existing contents of ${opts.outputDir} directory
  `);
  console.log('');

  return BPromise.resolve(confirm('Proceed?'))
    .tap(() => log(`\nRemoving ${buildDir} ..`))
    .then(() => fse.remove(buildDir))
    .tap(() => log(`Scraping ${opts.url} ..`))
    .tap(() => log(`Manually downloading ${manualFullUrls.length} urls ..`))
    .then(() => scrape(scrapeOpts))
    .then((result) => {
      const siteDirName = result[0].filename.split('/')[0];
      const siteDirPath = path.join(buildDir, siteDirName);

      return moveAllInside(siteDirPath, buildDir)
        .then(() => fse.remove(siteDirPath));
    })
    .tap(() => log(`Copying everything from files/* to build dir ..`))
    .then(() => fse.copy(path.join(__dirname, '../files'), buildDir, { overwrite: false, errorOnExist: true }))
    .tap(() => log(`Removing existing contents from ${opts.outputDir} ..`))
    .then(() => removeAllInside(opts.outputDir))
    .tap(() => log(`Copy build directory contents to ${opts.outputDir} ..`))
    .then(() => fse.copy(buildDir, opts.outputDir, { overwrite: false, errorOnExist: true }))
    .tap(() => console.log(`Done. Files written to ${opts.outputDir}`))
    .catch((err) => {
      throw err;
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
      });
    })
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
