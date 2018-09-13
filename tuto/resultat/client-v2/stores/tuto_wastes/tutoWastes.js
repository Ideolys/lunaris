module.exports = {
  name    : 'tutoWastes',
  url     : 'wastes',
  filters : [
    {
      source          : '@currentSite',
      sourceAttribute : 'id',
      localAttribute  : 'site',
      isRequired      : true,
      httpMethods     : ['GET']
    }, {
      source          : '@tutoWastes.filter.date',
      sourceAttribute : 'date',
      localAttribute  : 'date',
      isRequired      : true,
      httpMethods     : ['GET']
    }, {
      source          : '@tutoWastes.filter.label',
      sourceAttribute : 'label',
      localAttribute  : 'label',
      operator        : 'ILIKE'
    }
  ]
};
