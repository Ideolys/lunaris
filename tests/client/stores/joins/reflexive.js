module.exports = {
  name    : 'childParent',
  isLocal : true,
  map     : [{
    id     : ['<<int>>'],
    label  : ['string'],
    parent : ['@childParent']
  }]
};
