module.exports = [
  // We would like to check broken links for this also but
  // broken-link-checker fails if the first site returns status code 404
  { urlPath: '/404.html', filePath: '404.html', checkBrokenLinks: false },
  { urlPath: '/sitemap_index.xml', filePath: 'sitemap_index.xml' },
  { urlPath: '/page-sitemap.xml', filePath: 'page-sitemap.xml' },
  // This is empty but referred from sitemap_index.xml
  { urlPath: '/main-sitemap.xsl', filePath: 'main-sitemap.xsl' },
  { urlPath: '/robots.txt', filePath: 'robots.txt' },
];
