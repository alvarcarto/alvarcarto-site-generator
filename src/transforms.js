module.exports = [
  { name: 'validate-html', transform: require('./transforms/validate-html'), delay: 10 },
  { name: 'prettify', transform: require('./transforms/prettify') },
];
