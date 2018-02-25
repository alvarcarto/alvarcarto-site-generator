const _ = require('lodash');
const path = require('path');
const beautify = require('js-beautify');

module.exports = function prettify(filePath, buffer) {
  const ext = path.extname(filePath);
  if (!_.includes(['.html', '.css', '.js'], ext)) {
    return buffer;
  }

  const str = buffer.toString('utf8');

  switch (ext) {
    case '.html':
      return beautify.html(str, { indent_size: 2 });
    case '.css':
      return beautify.css(str, { indent_size: 2 });
    case '.js':
      return beautify.js(str, { indent_size: 2 });
    default:
      throw new Error(`Unknown file extension: ${ext}`);
  }
};
