module.exports = {
  name    : 'double',
  isLocal : true,
  filters : [
    {
      source          : '@filter.double',
      sourceAttribute : 'from',
      localAttribute  : 'from'
    }, {

      source          : '@filter.double',
      sourceAttribute : 'to',
      localAttribute  : 'to'
    }
  ],
  map : [{
    id   : ['<<int>>'],
    from : ['string'],
    to   : ['string']
  }]
};
