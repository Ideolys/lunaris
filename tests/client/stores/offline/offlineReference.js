module.exports = {
  name : 'offlineReference',
  url  : 'offlineReferenceSync',
  map  : [{
    id               : ['<<int>>'],
    label            : ['string'],
    offlineArray     : ['array', 'ref', '@offlineArraySync'],
    offlineReference : ['object', 'ref', '@offlineReferenceSync']
  }]
};
