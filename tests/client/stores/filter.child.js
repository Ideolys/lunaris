module.exports = {
  name    : 'filter.child',
  filters : [
    {
      source          : '@filter.parent',
      sourceAttribute : 'id',
      localAttribute  : 'parent.id',
      isRequired      : true,
      operator        : '='
    }
  ],
  map : [{
    id     : ['<<int>>'],
    parent : ['object', {
      id : ['int']
    }]
  }]
};
