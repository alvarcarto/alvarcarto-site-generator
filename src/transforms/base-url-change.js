const _ = require('lodash');
const path = require('path');
const URL = require('url-parse');

module.exports = function baseUrlChange(filePath, buffer, opts) {
  const ext = path.extname(filePath);
  if (!_.includes(['.html', '.css', '.js', '.svg', '.htm', '.txt', '.json', '.xml', '.xsl'], ext)) {
    return buffer;
  }

  // Replace e.g. all alvarcarto-wordpress.herokuapp.com -> alvarcarto.com
  const replaces = opts.replace.concat([opts.url]);
  let str = buffer.toString('utf8');

  _.forEach(replaces, (replaceUrl) => {
    const scrapeUrlHostname = new URL(replaceUrl).hostname.toLowerCase();
    const findRe = new RegExp(scrapeUrlHostname, 'g');
    str = str.replace(findRe, opts.target);
  });

  return str;
};
