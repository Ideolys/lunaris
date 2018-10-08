module.exports = {
  name    : 'childAggregateSum',
  isLocal : true,
  map     : [{
    id     : ['<<int>>'],
    total  : ['sum', 'parent.cost'],
    parent : ['array', {
      id   : ['<<int>>'],
      cost : ['number']
    }]
  }]
};
