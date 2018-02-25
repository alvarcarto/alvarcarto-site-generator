const _ = require('lodash');
const path = require('path');
const URL = require('url-parse');

module.exports = function baseUrlChange(filePath, buffer, opts) {
  const ext = path.extname(filePath);
  if (!_.includes(['.html', '.css', '.js', '.svg', '.htm', '.txt', '.json'], ext)) {
    return buffer;
  }

  const scrapeUrlHostname = new URL(opts.url).hostname.toLowerCase();
  const findRe = new RegExp(scrapeUrlHostname, 'g');
  const str = buffer.toString('utf8');

  // Replace e.g. all alvarcarto-wordpress.herokuapp.com -> alvarcarto.com
  return str.replace(findRe, 'alvarcarto.com');
};
