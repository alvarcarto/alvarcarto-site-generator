const _ = require('lodash');
const yargs = require('yargs');
const validator = require('validator');

const VERSION = require('../package.json').version;

const defaultOpts = {
  concurrency: 10,
  verbose: true,
  outputDir: './build',
  checkBrokenLinks: true,
  abortOnErrors: true,
  target: 'alvarcarto.com',
};

function getOpts() {
  const userOpts = getUserOpts();
  const opts = _.merge(defaultOpts, userOpts);
  return validateAndTransformOpts(opts);
}

function getUserOpts() {
  const userOpts = yargs
    .usage('Usage: $0 <url> [options]\n\n<url>   url where to scape site e.g. alvarcarto.com\n')
    .example('$0 https://alvarcarto.com')
    .demand(1)

    .option('verbose', {
      describe: 'Increase logging',
      default: defaultOpts.verbose,
      type: 'boolean',
    })

    .option('concurrency', {
      describe: 'How many concurrent requests to execute',
      default: defaultOpts.concurrency,
      type: 'integer',
    })
    .alias('c', 'concurrency')

    .option('target', {
      describe: 'Hostname for the release target',
      default: defaultOpts.target,
    })
    .alias('t', 'target')

    .option('output-dir', {
      describe: 'Where to output files',
      default: defaultOpts.outputDir,
    })
    .alias('o', 'output-dir')

    .option('check-broken-links', {
      describe: 'If true, checks given site for broken links',
      default: defaultOpts.checkBrokenLinks,
    })
    .alias('b', 'check-broken-links')

    .option('abort-on-errors', {
      describe: 'If true, aborts on build errors',
      default: defaultOpts.abortOnErrors,
    })
    .alias('a', 'abort-on-errors')

    .help('h')
    .alias('h', 'help')
    .alias('v', 'version')
    .version(VERSION)
    .argv;

  // eslint-disable-next-line
  userOpts.url = userOpts._[0];
  return userOpts;
}

function validateAndTransformOpts(opts) {
  if (!validator.isURL(opts.url)) throwArgumentError(`Invalid url argument: ${opts.url}`);
  if (!/^\d+$/.test(opts.concurrency)) throwArgumentError('Invalid "concurrency" argument');

  // Transform opts if needed
  return opts;
}

function throwArgumentError(message) {
  const err = new Error(message);
  err.argumentError = true;
  throw err;
}

module.exports = {
  getOpts,
};
