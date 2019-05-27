module.exports = {
  name    : 'double',
  isLocal : true,
  filters : [
    {
      source          : '@filter.double',
      sourceAttribute : 'from',
      localAttribute  : 'from',
      operator        : '>='
    }, {

      source          : '@filter.double',
      sourceAttribute : 'to',
      localAttribute  : 'to',
      operator        : '<='
    }
  ],
  map : [{
    id   : ['<<int>>'],
    from : ['string'],
    to   : ['string']
  }]
};
