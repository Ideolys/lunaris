describe('invalidate', () => {

  it('it should init invalidations', done => {
    lunaris._indexedDB.upsert('_invalidations', { url : 'GET /all', date : Date.now() });
    lunaris.initInvalidations(() => {
      should(lunaris.invalidations).be.an.Object();
      should(lunaris.invalidations['GET /all']).be.ok();
      lunaris._indexedDB.clear('_invalidations', done);
    });
  });

});
