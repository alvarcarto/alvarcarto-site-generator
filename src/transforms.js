module.exports = [
  // Disabled for now
  // { name: 'prettify', transform: require('./transforms/prettify') },

  { name: 'base-url-change', transform: require('./transforms/base-url-change') },
  { name: 'validate-html', transform: require('./transforms/validate-html'), delay: 10 },
];
