/**
 * Get GET urls for a store
 * @param {Object} store
 * @returns {Array}
 */
function getUrls (store) {
  let urls      = [];
  let baseUrl   = store.url || store.name;
  let filterUrl = '';
  let suffix    = store.urlSuffix ? '/' + store.urlSuffix : '';

  if (store.isLocal) {
    return urls;
  }

  urls.push('GET ' + baseUrl + suffix);
  urls.push('GET ' + baseUrl + '/#' + suffix);

  if (!store.filters) {
    return urls;
  }

  for (var i = 0, len = store.filters.length; i < len; i++) {
    let filter = store.filters[i];

    if (!filter.isRequired) {
      continue;
    }

    if (filter.httpMethods && filter.httpMethods.indexOf('GET') === -1) {
      continue;
    }

    filterUrl += '/' + filter.localAttribute + '/#';
  }

  if (filterUrl !== '') {
    urls.push('GET ' + baseUrl + filterUrl + suffix);
  }


  return urls;
}

/**
 * Add store in urls graph
 * @param {Object} graph url -> store name
 */
module.exports = function addStoreInGraph (graph, store) {
  let urls = getUrls(store);

  for (var i = 0, len = urls.length; i < len; i++) {
    if (!graph[urls[i]]) {
      graph[urls[i]] = [];
    }

    graph[urls[i]].push(store.name);
  }
};
