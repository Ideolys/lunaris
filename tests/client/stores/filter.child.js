module.exports = {
  name    : 'filter.child',
  filters : [
    {
      source          : '@filter.parent',
      sourceAttribute : 'id',
      localAttribute  : 'parent.id',
      isRequired      : true
    }
  ],
  map : [{
    id     : ['<<int>>'],
    parent : ['object', {
      id : ['int']
    }]
  }]
};
