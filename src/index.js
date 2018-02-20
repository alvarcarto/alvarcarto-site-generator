const { URL } = require('url');
const scrape = require('website-scraper');
const { getOpts } = require('./cli-parser');

function main(opts) {
  const scrapeOpts = {
    urls: [opts.url],
    directory: opts.outputDir,
    recursive: true,
    filenameGenerator: 'bySiteStructure',
    urlFilter: url => new URL(url).hostname.toLowerCase() === new URL(opts.url).hostname.toLowerCase(),
    prettifyUrls: true,
    requestConcurrency: opts.concurrency,
  };

  return scrape(scrapeOpts)
    .then((result) => {
      console.log(`Done. Files written to ${opts.outputDir}`);
    })
    .catch((err) => {
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
      throw err;
    });
}
