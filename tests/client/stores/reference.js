module.exports = {
  name    : 'reference',
  islocal : true,
  map     : [{
    id   : ['<<int>>'],
    http : ['object', {
      id : ['int', 'ref', '@http']
    }]
  }]
};
