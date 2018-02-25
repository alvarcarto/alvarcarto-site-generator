const _ = require('lodash');
const path = require('path');
const chalk = require('chalk');
const validator = require('html-validator');

module.exports = function validate(filePath, buffer) {
  const ext = path.extname(filePath);

  if (ext !== '.html') {
    return buffer;
  }

  return validator({
    format: 'json',
    data: buffer.toString('utf8'),
  })
    .then((data) => {
      const errors = _.filter(data.messages, m => m.type === 'error');

      if (errors.length > 0) {
        console.log('');
        console.log(chalk.underline(filePath));
      }

      const lineMaxLen = findMaxLength(_.map(errors, e => String(e.lastLine)));
      const colMaxLen = findMaxLength(_.map(errors, e => String(e.firstColumn)));
      _.forEach(errors, (e) => {
        const lineNum = e.lastLine;
        const colNum = e.firstColumn;
        const start = `${_.padStart(lineNum, lineMaxLen)}:${_.padEnd(colNum, colMaxLen)}`;

        console.log(`${chalk.gray(start)} ${chalk.red(e.type)} ${e.message}`);
        const code = chalk.gray(formatCode(e));
        console.log(`${_.padStart('', lineMaxLen + colMaxLen + ': error'.length)} ${code}`);
      });

      if (errors.length > 0) {
        return new Error('Validation errors found');
      }

      return buffer;
    })
    .catch((err) => {
      throw err;
    });
};

function formatCode(e) {
  return e.extract.slice(e.hiliteStart, e.hiliteStart + e.hiliteLength);
}

function findMaxLength(arr) {
  let maxLen = 0;
  _.forEach(arr, (str) => {
    if (str.length > maxLen) {
      maxLen = str.length;
    }
  });
  return maxLen;
}
