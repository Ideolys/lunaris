module.exports = {
  name    : 'http',
  filters : [{
    source          : '@http.filter',
    sourceAttribute : 'label',
    localAttribute  : 'label',
    operator        : '='
  }],
  map : [{
    id    : ['<<int>>'],
    label : ['string']
  }]
};
