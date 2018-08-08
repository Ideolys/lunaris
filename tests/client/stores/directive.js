module.exports = {
  name    : 'directive',
  isLocal : true,
  map     : {
    id    : ['<<int>>'],
    label : ['string'],
    type  : ['object', {
      id    : ['int'],
      label : ['string']
    }],
    children : ['array', [], {
      id     : ['<<int>>'],
      string : ['<label>'],
    }]
  }
};
