module.exports = {
  name    : 'childAggregate',
  isLocal : true,
  map     : [{
    id     : ['<<int>>'],
    total  : ['sum', 'parent.price'],
    parent : ['@parent']
  }]
};
