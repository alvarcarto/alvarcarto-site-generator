module.exports = [
  { name: 'validate-html', transform: require('./transforms/validate-html'), delay: 10 },

  // Disabled for now
  // { name: 'prettify', transform: require('./transforms/prettify') },

  { name: 'base-url-change', transform: require('./transforms/base-url-change') },
];
