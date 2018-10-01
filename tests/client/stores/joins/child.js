module.exports = {
  name    : 'child',
  isLocal : true,
  map     : [{
    id     : ['<<int>>'],
    parent : ['@parent']
  }]
};
