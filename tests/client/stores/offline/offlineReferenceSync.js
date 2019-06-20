module.exports = {
  name : 'offlineReferenceSync',
  map  : [{
    id           : ['<<int>>'],
    label        : ['string'],
    offlineArray : ['array', 'ref', '@offlineArraySync']
  }]
};
