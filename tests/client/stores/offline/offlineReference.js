module.exports = {
  name : 'offlineReference',
  url  : 'offlineReferenceSync',
  map  : [{
    id           : ['<<int>>'],
    label        : ['string'],
    offlineArray : ['array', {
      id : ['<<int>>', 'ref', '@offlineArraySync']
    }],
    offlineReference : ['object', {
      id : ['int', 'ref', '@offlineReferenceSync']
    }]
  }]
};
