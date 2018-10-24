module.exports = {
  name    : 'computedConstant',
  isLocal : true,
  map     : [{
    id               : ['<<int>>'],
    label            : ['string'],
    labelCapitalized : [function (obj, constants) {
      return obj.label.toUpperCase() + '-' + constants.CONSTANT1;
    }]
  }]
};
