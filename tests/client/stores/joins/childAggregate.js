module.exports = {
  name    : 'childAggregate',
  isLocal : true,
  map     : [{
    id     : ['<<int>>'],
    total  : ['sumAgg', 'parent.price'],
    parent : ['@parent']
  }]
};
