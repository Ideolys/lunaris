module.exports = {
  name    : 'http',
  filters : [{
    source          : '@http.filter',
    sourceAttribute : 'label',
    localAttribute  : 'label',
    operator        : 'ILIKE'
  }],
  map : [{
    id    : ['<<int>>'],
    label : ['string']
  }],
  isLazyLoad : true
};
