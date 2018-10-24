module.exports = {
  name    : 'computed',
  isLocal : true,
  map     : [{
    id               : ['<<int>>'],
    label            : ['string'],
    labelCapitalized : [function (obj) {
      return obj.label.toUpperCase();
    }]
  }]
};
