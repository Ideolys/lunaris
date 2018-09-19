module.exports = {
  name    : 'tutoScales',
  url     : 'scales',
  filters : [{
    source          : '@currentSite',
    sourceAttribute : 'id',
    localAttribute  : 'site',
    isRequired      : true,
    httpMethods     : ['GET']
  }, {
    source          : '@tutoScales.filter.waste',
    sourceAttribute : 'id',
    localAttribute  : 'waste[id]',
    operator        : 'ILIKE'
  }],
  map : [{
    id           : ['<<int>>'],
    idSiteOwner  : ['number'],
    serialNumber : ['string'],
    label        : ['string'],
    tare         : ['number', 0, 'min', 0],
    waste        : ['object', {
      id : ['<<int>>'],
    }],
    gateway : ['object', {
      id : ['<<int>>', 'optional'],
    }]
  }],
  primaryKey : 'id'
};
