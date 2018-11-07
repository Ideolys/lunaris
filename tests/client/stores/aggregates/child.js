module.exports = {
  name    : 'childAggregateSum',
  isLocal : true,
  map     : [{
    id     : ['<<int>>'],
    total  : ['sumAgg', 'parent.cost'],
    parent : ['array', {
      id   : ['<<int>>'],
      cost : ['number']
    }]
  }]
};
