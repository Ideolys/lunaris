describe('Offline to online synchronisation', () => {

  before(done => {
    // Let time to lunaris to init
    setTimeout(done, 400);
  });

  beforeEach(done => {
    lunaris.offline.isOnline = true;
    lunaris.begin();
    lunaris.clear('@offlineArraySync');
    lunaris.clear('@offlineObjectSync');
    lunaris.clear('@offlineReferenceSync');
    lunaris.clear('@offlineReference');
    lunaris.clear('@offlineErrorSync');
    lunaris.clear('@lunarisOfflineTransactions');
    lunaris.localStorage.clear('lunarisOfflineTransactions');
    lunaris.commit(done);
  });

  it('should have added the transaction to the collection', done => {
    lunaris.offline.isOnline = false;

    lunaris.insert('@offlineArraySync', {
      label : 'A'
    });

    let collectionItems = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
    should(collectionItems).be.an.Array().and.have.lengthOf(1);
    should(collectionItems[0].store).eql('offlineArraySync');
    should(collectionItems[0].method).eql('POST');
    should(collectionItems[0].url).eql('/offlineArraySync');
    should(collectionItems[0].data).be.an.Object();

    lunaris.offline.isOnline = true;

    lunaris.offline.pushOfflineHttpTransactions(() => {
      let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(0);


      collectionItems = lunaris._stores.offlineArraySync.data.getAll();
      should(collectionItems).be.an.Array().and.have.lengthOf(1);
      should(collectionItems[0].id).be.a.Number().and.eql(1);

      should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ 1 : 1, _1 : null});
      done();
    });
  });

  it('should have sent insert event', done => {
    lunaris.offline.isOnline = false;

    const hook = (payload) => {
      should(payload).not.ok();
      lunaris.removeHook('insert@' + lunaris.utils.offlineStore, hook);
      done();
    };

    lunaris.hook('insert@' + lunaris.utils.offlineStore, hook);

    lunaris.insert('@offlineArraySync', {
      label : 'A'
    });
  });

  it('should set a date when sync is finished', done => {
    lunaris.offline.isOnline = false;

    lunaris.insert('@offlineArraySync', {
      label : 'A'
    });

    should(lunaris.localStorage.get('lunarisOfflineTransactions')).eql(null);

    let collectionItems = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
    should(collectionItems).be.an.Array().and.have.lengthOf(1);

    lunaris.offline.isOnline = true;

    lunaris.offline.pushOfflineHttpTransactions(() => {
      let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(0);

      should(lunaris.localStorage.get('lunarisOfflineTransactions')).be.a.String();
      should(new Date(lunaris.localStorage.get('lunarisOfflineTransactions'))).be.a.Date();
      done();
    });
  });

  it('should have populated the collection at application startup', done => {
    lunaris.offline.isOnline = false;

    lunaris.insert('@offlineArraySync', {
      label : 'A'
    });

    let _lunaris = lunarisInstance();

    setTimeout(() => {
      should(_lunaris._stores[lunaris.utils.offlineStore].data.getCurrentId()).eql(2);
      should(_lunaris._stores[lunaris.utils.offlineStore].data.getCurrentRowId()).eql(2);

      _lunaris.websocket.stop(() => {
        _lunaris = null;
        lunaris.offline.isOnline = true;
        done();
      });
    }, 160);
  });

  it('should push offline transaction of a store array: POST', done => {
    lunaris.offline.isOnline = false;

    lunaris.insert('@offlineArraySync', {
      label : 'A'
    });

    should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ _1 : 1 });

    let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
    should(transactions).be.an.Array().and.have.lengthOf(1);
    should(transactions[0].store).eql('offlineArraySync');
    should(transactions[0].method).eql('POST');
    should(transactions[0].url).eql('/offlineArraySync');
    should(transactions[0].data).be.an.Object();

    lunaris.offline.isOnline = true;

    lunaris.offline.pushOfflineHttpTransactions(() => {
      transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(0);

      let collectionItems = lunaris._stores.offlineArraySync.data.getAll();
      should(collectionItems).be.an.Array().and.have.lengthOf(1);
      should(collectionItems[0].id).be.a.Number().and.eql(1);

      should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ 1 : 1, _1 : null });
      done();
    });
  });

  it('should push offline transaction of a store array with multiple data: POST', done => {
    lunaris.offline.isOnline = false;

    lunaris.insert('@offlineArraySync', [
      { label : 'A' },
      { label : 'B' }
    ]);

    should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ _1 : 1, _2 : 2 });

    let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
    should(transactions).be.an.Array().and.have.lengthOf(1);
    should(transactions[0].store).eql('offlineArraySync');
    should(transactions[0].method).eql('POST');
    should(transactions[0].url).eql('/offlineArraySync');
    should(transactions[0].data).be.an.Array().and.have.lengthOf(2);
    should(transactions[0].data[0]._id).eql(1);
    should(transactions[0].data[1]._id).eql(2);

    lunaris.offline.isOnline = true;

    lunaris.offline.pushOfflineHttpTransactions(() => {
      transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(0);

      let collectionItems = lunaris._stores.offlineArraySync.data.getAll();
      should(collectionItems).be.an.Array().and.have.lengthOf(2);
      should(collectionItems[0].id).be.a.Number().and.eql(1);
      should(collectionItems[1].id).be.a.Number().and.eql(2);

      should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ 1 : 1, 2 : 2, _1 : null, _2 : null });
      done();
    });
  });

  it('should push offline transaction of a store object: POST', done => {
    lunaris.offline.isOnline = false;

    lunaris.insert('@offlineObjectSync', {
      id    : 1,
      label : 'A'
    });

    should(lunaris._stores.offlineObjectSync.data.getIndexId()).eql({ 1 : 1 });

    let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
    should(transactions).be.an.Array().and.have.lengthOf(1);
    should(transactions[0].store).eql('offlineObjectSync');
    should(transactions[0].method).eql('POST');
    should(transactions[0].url).eql('/offlineObjectSync');
    should(transactions[0].data).be.an.Object();

    lunaris.offline.isOnline = true;

    lunaris.offline.pushOfflineHttpTransactions(() => {
      transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(0);

      let collectionItems = lunaris._stores.offlineObjectSync.data.getAll();
      should(collectionItems).be.an.Object();

      should(lunaris._stores.offlineObjectSync.data.getIndexId()).eql({ 1 : 1 });
      done();
    });
  });

  it('should push offline transaction of a store array: PUT', done => {
    lunaris.offline.isOnline = false;

    lunaris._stores.offlineArraySync.data.add({ id : 1, label : 'A' });

    lunaris.update('offlineArraySync', { _id : 1, id : 1, label : 'A' });

    let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
    should(transactions).be.an.Array().and.have.lengthOf(1);
    should(transactions[0].store).eql('offlineArraySync');
    should(transactions[0].method).eql('PUT');
    should(transactions[0].url).eql('/offlineArraySync/1');
    should(transactions[0].data).be.an.Object();

    lunaris.offline.isOnline = true;

    lunaris.offline.pushOfflineHttpTransactions(() => {
      transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(0);

      let collectionItems = lunaris._stores.offlineArraySync.data.getAll();
      should(collectionItems).be.an.Array().and.have.lengthOf(1);
      should(collectionItems[0].label).be.a.String().and.eql('A-1');

      should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ 1 : 1 });
      done();
    });
  });

  it('should push offline transaction of a store array with multiple data: PUT', done => {
    lunaris.offline.isOnline = false;

    lunaris._stores.offlineArraySync.data.add({ id : 1, label : 'A' });
    lunaris._stores.offlineArraySync.data.add({ id : 2, label : 'B' });

    lunaris.update('offlineArraySync', [
      { _id : 1, id : 1, label : 'A' },
      { _id : 2, id : 2, label : 'B' }
    ]);

    should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ 1 : 1, 2 : 2 });

    let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
    should(transactions).be.an.Array().and.have.lengthOf(1);
    should(transactions[0].store).eql('offlineArraySync');
    should(transactions[0].method).eql('PUT');
    should(transactions[0].url).eql('/offlineArraySync');
    should(transactions[0].data).be.an.Array().and.have.lengthOf(2);

    lunaris.offline.isOnline = true;

    lunaris.offline.pushOfflineHttpTransactions(() => {
      transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(0);

      let collectionItems = lunaris._stores.offlineArraySync.data.getAll();
      should(collectionItems).be.an.Array().and.have.lengthOf(2);
      should(collectionItems[0].label).be.a.String().and.eql('A-1');
      should(collectionItems[1].label).be.a.String().and.eql('B-2');

      should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ 1 : 1, 2 : 2 });
      done();
    });
  });

  it('should push offline transaction of a store object: PUT', done => {
    lunaris.offline.isOnline = false;

    lunaris._stores.offlineArraySync.data.add({ id : 1, label : 'A' });

    lunaris.update('offlineObjectSync', { _id : 1, id : 1, label : 'A' });

    let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
    should(transactions).be.an.Array().and.have.lengthOf(1);
    should(transactions[0].store).eql('offlineObjectSync');
    should(transactions[0].method).eql('PUT');
    should(transactions[0].url).eql('/offlineObjectSync/1');
    should(transactions[0].data).be.an.Object();

    lunaris.offline.isOnline = true;

    lunaris.offline.pushOfflineHttpTransactions(() => {
      transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(0);

      let collectionItems = lunaris._stores.offlineObjectSync.data.getAll();
      should(collectionItems).be.an.Object();
      should(collectionItems.label).be.a.String().and.eql('A-1');

      should(lunaris._stores.offlineObjectSync.data.getIndexId()).eql({ 1 : 1 });
      done();
    });
  });

  it('should push offline transaction of a store array: DELETE', done => {
    lunaris.offline.isOnline = false;

    lunaris._stores.offlineArraySync.data.add({ id : 1, label : 'A' });

    lunaris.delete('@offlineArraySync', {
      _id   : 1,
      id    : 1,
      label : 'A'
    });

    should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ 1 : null });

    setTimeout(() => {
      let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(1);
      should(transactions[0].store).eql('offlineArraySync');
      should(transactions[0].method).eql('DELETE');
      should(transactions[0].url).eql('/offlineArraySync/1');
      should(transactions[0].data).be.an.Object();

      lunaris.offline.isOnline = true;

      lunaris.offline.pushOfflineHttpTransactions(() => {
        transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
        should(transactions).be.an.Array().and.have.lengthOf(0);

        let collectionItems = lunaris._stores.offlineArraySync.data.getAll();
        should(collectionItems).be.an.Array().and.have.lengthOf(0);

        done();
      });
    }, 20);
  });

  it('should push offline transaction of a store object: DELETE', done => {
    lunaris.offline.isOnline = false;

    lunaris._stores.offlineObjectSync.data.add({ id : 1, label : 'A' });

    lunaris.delete('@offlineObjectSync', {
      _id   : 1,
      id    : 1,
      label : 'A'
    });

    should(lunaris._stores.offlineObjectSync.data.getIndexId()).eql({ 1 : null});

    setTimeout(() => {
      let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(1);
      should(transactions[0].store).eql('offlineObjectSync');
      should(transactions[0].method).eql('DELETE');
      should(transactions[0].url).eql('/offlineObjectSync/1');
      should(transactions[0].data).be.an.Object();

      lunaris.offline.isOnline = true;

      lunaris.offline.pushOfflineHttpTransactions(() => {
        transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
        should(transactions).be.an.Array().and.have.lengthOf(0);

        let collectionItems = lunaris._stores.offlineObjectSync.data.getAll();
        should(collectionItems).eql(null);

        done();
      });
    }, 20);
  });

  describe('References', () => {

    it('should push offline transaction and update referenced store', done => {
      lunaris.offline.isOnline = false;

      lunaris._stores.offlineArraySync.data.add({ id : 1, label : 'A' });

      lunaris.insert('@offlineArraySync', [
        { label : 'B' },
        { label : 'C' },
        { label : 'D' },
      ]);

      lunaris.insert('@offlineReferenceSync', [
        {
          label        : 'A',
          offlineArray : [
            { id : '_3' },
            { id : 1    }
          ]
        },
        {
          label        : 'B',
          offlineArray : [
            { id : '_2' },
            { id : '_4' },
            { id : '_3' },
          ]
        }
      ]);

      should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({
        1  : 1,
        _2 : 2,
        _3 : 3,
        _4 : 4
      });
      should(lunaris._stores.offlineReferenceSync.data.getIndexId()).eql({
        _1 : 1,
        _2 : 2
      });
      should(lunaris._stores.offlineReferenceSync.data.getIndexReferences()).eql({
        offlineArraySync : [
          [1, '_2', '_3', '_4'], [[1], [2], [1, 2], [2]]
        ]
      });

      let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(2);
      should(transactions[0].store).eql('offlineArraySync');
      should(transactions[0].method).eql('POST');
      should(transactions[0].url).eql('/offlineArraySync');
      should(transactions[0].data).be.an.Array().and.have.lengthOf(3);
      should(transactions[0].data[0]._id).eql(2);
      should(transactions[0].data[0].id).eql('_2');
      should(transactions[0].data[1]._id).eql(3);
      should(transactions[0].data[1].id).eql('_3');
      should(transactions[0].data[2]._id).eql(4);
      should(transactions[0].data[2].id).eql('_4');

      should(transactions[1].store).eql('offlineReferenceSync');
      should(transactions[1].method).eql('POST');
      should(transactions[1].url).eql('/offlineReferenceSync');
      should(transactions[1].data).be.an.Array().and.have.lengthOf(2);
      should(transactions[1].data[0]._id).eql(1);
      should(transactions[1].data[0].id).eql('_1');
      should(transactions[1].data[1]._id).eql(2);
      should(transactions[1].data[1].id).eql('_2');

      lunaris.offline.isOnline = true;

      lunaris.offline.pushOfflineHttpTransactions(() => {
        transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
        should(transactions).be.an.Array().and.have.lengthOf(0);

        let collectionItems = lunaris._stores.offlineArraySync.data.getAll();
        should(collectionItems).be.an.Array().and.have.lengthOf(4);
        should(collectionItems[0].id).be.a.Number().and.eql(1);
        should(collectionItems[1].id).be.a.Number().and.eql(2);
        should(collectionItems[2].id).be.a.Number().and.eql(3);
        should(collectionItems[3].id).be.a.Number().and.eql(4);

        collectionItems = lunaris._stores.offlineReferenceSync.data.getAll();
        should(collectionItems).be.an.Array().and.have.lengthOf(2);
        should(collectionItems[0].id).be.a.Number().and.eql(1);
        should(collectionItems[0].offlineArray).be.an.Array().and.have.lengthOf(2);
        should(collectionItems[0].offlineArray[0].id).be.a.Number().and.eql(3);
        should(collectionItems[0].offlineArray[1].id).be.a.Number().and.eql(1);
        should(collectionItems[1].id).be.a.Number().and.eql(2);
        should(collectionItems[1].offlineArray).be.an.Array().and.have.lengthOf(3);
        should(collectionItems[1].offlineArray[0].id).be.a.Number().and.eql(2);
        should(collectionItems[1].offlineArray[1].id).be.a.Number().and.eql(4);
        should(collectionItems[1].offlineArray[2].id).be.a.Number().and.eql(3);

        should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({
          1  : 1,
          2  : 2,
          3  : 3,
          4  : 4,
          _2 : null,
          _3 : null,
          _4 : null
        });
        should(lunaris._stores.offlineReferenceSync.data.getIndexId()).eql({
          1  : 1,
          2  : 2,
          _1 : null,
          _2 : null
        });
        done();
      });
    });

    it('should push offline transaction and update referenced stores', done => {
      lunaris.offline.isOnline = false;

      lunaris._stores.offlineArraySync.data.add({ id : 1, label : 'A' });

      lunaris.insert('@offlineArraySync', [
        { label : 'B' },
        { label : 'C' },
        { label : 'D' },
      ]);

      lunaris.insert('@offlineReferenceSync', [
        {
          label        : 'A',
          offlineArray : [
            { id : '_3' },
            { id : 1    }
          ]
        },
        {
          label        : 'B',
          offlineArray : [
            { id : '_2' },
            { id : '_4' },
            { id : '_3' },
          ]
        }
      ]);

      lunaris.insert('@offlineReference', {
        label        : 'A',
        offlineArray : [
          { id : '_3' },
          { id : 1    }
        ],
        offlineReference : {
          id : '_2'
        }
      });

      should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({
        1  : 1,
        _2 : 2,
        _3 : 3,
        _4 : 4
      });
      should(lunaris._stores.offlineReferenceSync.data.getIndexId()).eql({
        _1 : 1,
        _2 : 2
      });
      should(lunaris._stores.offlineReferenceSync.data.getIndexReferences()).eql({
        offlineArraySync : [
          [1, '_2', '_3', '_4'], [[1], [2], [1, 2], [2]]
        ]
      });
      should(lunaris._stores.offlineReference.data.getIndexId()).eql({
        _1 : 1
      });
      should(lunaris._stores.offlineReference.data.getIndexReferences()).eql({
        offlineArraySync : [
          [1, '_3'], [[1], [1]]
        ],
        offlineReferenceSync : [
          ['_2'], [[1]]
        ]
      });

      let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(3);
      should(transactions[0].store).eql('offlineArraySync');
      should(transactions[0].method).eql('POST');
      should(transactions[0].url).eql('/offlineArraySync');
      should(transactions[0].data).be.an.Array().and.have.lengthOf(3);
      should(transactions[0].data[0]._id).eql(2);
      should(transactions[0].data[0].id).eql('_2');
      should(transactions[0].data[1]._id).eql(3);
      should(transactions[0].data[1].id).eql('_3');
      should(transactions[0].data[2]._id).eql(4);
      should(transactions[0].data[2].id).eql('_4');

      should(transactions[1].store).eql('offlineReferenceSync');
      should(transactions[1].method).eql('POST');
      should(transactions[1].url).eql('/offlineReferenceSync');
      should(transactions[1].data).be.an.Array().and.have.lengthOf(2);
      should(transactions[1].data[0]._id).eql(1);
      should(transactions[1].data[0].id).eql('_1');
      should(transactions[1].data[1]._id).eql(2);
      should(transactions[1].data[1].id).eql('_2');

      should(transactions[2].store).eql('offlineReference');
      should(transactions[2].method).eql('POST');
      should(transactions[2].url).eql('/offlineReferenceSync');
      should(transactions[2].data).be.an.Object();
      should(transactions[2].data._id).eql(1);
      should(transactions[2].data.id).eql('_1');

      lunaris.offline.isOnline = true;

      lunaris.offline.pushOfflineHttpTransactions(() => {
        transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
        should(transactions).be.an.Array().and.have.lengthOf(0);

        let collectionItems = lunaris._stores.offlineArraySync.data.getAll();
        should(collectionItems).be.an.Array().and.have.lengthOf(4);
        should(collectionItems[0].id).be.a.Number().and.eql(1);
        should(collectionItems[1].id).be.a.Number().and.eql(2);
        should(collectionItems[2].id).be.a.Number().and.eql(3);
        should(collectionItems[3].id).be.a.Number().and.eql(4);

        collectionItems = lunaris._stores.offlineReferenceSync.data.getAll();
        should(collectionItems).be.an.Array().and.have.lengthOf(2);
        should(collectionItems[0].id).be.a.Number().and.eql(1);
        should(collectionItems[0].offlineArray).be.an.Array().and.have.lengthOf(2);
        should(collectionItems[0].offlineArray[0].id).be.a.Number().and.eql(3);
        should(collectionItems[0].offlineArray[1].id).be.a.Number().and.eql(1);
        should(collectionItems[1].id).be.a.Number().and.eql(2);
        should(collectionItems[1].offlineArray).be.an.Array().and.have.lengthOf(3);
        should(collectionItems[1].offlineArray[0].id).be.a.Number().and.eql(2);
        should(collectionItems[1].offlineArray[1].id).be.a.Number().and.eql(4);
        should(collectionItems[1].offlineArray[2].id).be.a.Number().and.eql(3);

        collectionItems = lunaris._stores.offlineReference.data.getAll();
        should(collectionItems).be.an.Array().and.have.lengthOf(1);
        should(collectionItems[0].id).be.a.Number().and.eql(1);
        should(collectionItems[0].offlineReference.id).be.a.Number().and.eql(2);

        should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ 1 : 1, 2 : 2, 3 : 3, 4 : 4, _2 : null, _3 : null, _4 : null });
        should(lunaris._stores.offlineReferenceSync.data.getIndexId()).eql({ 1 : 1, 2 : 2, _1 : null, _2 : null });
        should(lunaris._stores.offlineReference.data.getIndexId()).eql({ 1 : 1, _1 : null });
        done();
      });
    });

  });

  describe('Errors', () => {

    it('should set the offline transaction in error if the transaction failed', done => {
      lunaris.offline.isOnline = false;

      lunaris.insert('@offlineErrorSync', {
        label : 'A'
      });

      should(lunaris._stores.offlineErrorSync.data.getIndexId()).eql({ _1 : 1 });

      let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(1);
      should(transactions[0].store).eql('offlineErrorSync');
      should(transactions[0].method).eql('POST');
      should(transactions[0].url).eql('/offlineErrorSync');
      should(transactions[0].data).be.an.Object();

      lunaris.offline.isOnline = true;

      lunaris.offline.pushOfflineHttpTransactions(() => {
        transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
        should(transactions).be.an.Array().and.have.lengthOf(1);
        should(transactions[0].isInError).be.ok().and.eql(true);

        let collectionItems = lunaris._stores.offlineErrorSync.data.getAll();
        should(collectionItems).have.lengthOf(1);

        done();
      });
    });

    it('should set the offline transactions in error if the transaction failed : referenced store', done => {
      lunaris.offline.isOnline = false;

      lunaris._stores.offlineArraySync.data.add({ id : 1, label : 'A' });

      lunaris.insert('@offlineArraySync', [
        { label : 'B' },
        { label : 'C' },
        { label : 'D', isError : true },
      ]);

      lunaris.insert('@offlineReferenceSync', [
        {
          label        : 'A',
          offlineArray : [
            { id : '_3' },
            { id : 1    }
          ]
        },
        {
          label        : 'B',
          offlineArray : [
            { id : '_2' },
            { id : '_4' },
            { id : '_3' },
          ]
        }
      ]);

      should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ 1 : 1, _2 : 2, _3 : 3, _4 : 4 });
      should(lunaris._stores.offlineReferenceSync.data.getIndexId()).eql({ _1 : 1, _2 : 2 });
      should(lunaris._stores.offlineReferenceSync.data.getIndexReferences()).eql({
        offlineArraySync : [
          [1, '_2', '_3', '_4'], [[1], [2], [1, 2], [2]]
        ]
      });

      let transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
      should(transactions).be.an.Array().and.have.lengthOf(2);
      should(transactions[0].store).eql('offlineArraySync');
      should(transactions[0].method).eql('POST');
      should(transactions[0].url).eql('/offlineArraySync');
      should(transactions[0].data).be.an.Array().and.have.lengthOf(3);
      should(transactions[0].data[0]._id).eql(2);
      should(transactions[0].data[0].id).eql('_2');
      should(transactions[0].data[1]._id).eql(3);
      should(transactions[0].data[1].id).eql('_3');
      should(transactions[0].data[2]._id).eql(4);
      should(transactions[0].data[2].id).eql('_4');

      should(transactions[1].store).eql('offlineReferenceSync');
      should(transactions[1].method).eql('POST');
      should(transactions[1].url).eql('/offlineReferenceSync');
      should(transactions[1].data).be.an.Array().and.have.lengthOf(2);
      should(transactions[1].data[0]._id).eql(1);
      should(transactions[1].data[0].id).eql('_1');
      should(transactions[1].data[1]._id).eql(2);
      should(transactions[1].data[1].id).eql('_2');

      lunaris.offline.isOnline = true;

      lunaris.offline.pushOfflineHttpTransactions(() => {
        transactions = lunaris._stores[lunaris.utils.offlineStore].data.getAll();
        should(transactions).be.an.Array().and.have.lengthOf(2);

        should(transactions[0].store).eql('offlineArraySync');
        should(transactions[0].isInError).eql(true);
        should(transactions[1].store).eql('offlineReferenceSync');
        should(transactions[1].isInError).eql(true);

        let collectionItems = lunaris._stores.offlineArraySync.data.getAll();
        should(collectionItems).be.an.Array().and.have.lengthOf(4);
        should(collectionItems[0].id).be.a.Number().and.eql(1);
        should(collectionItems[1].id).be.a.String().and.eql('_2');
        should(collectionItems[2].id).be.a.String().and.eql('_3');
        should(collectionItems[3].id).be.a.String().and.eql('_4');

        collectionItems = lunaris._stores.offlineReferenceSync.data.getAll();
        should(collectionItems).be.an.Array().and.have.lengthOf(2);
        should(collectionItems[0].id).be.a.String().and.eql('_1');
        should(collectionItems[0].offlineArray).be.an.Array().and.have.lengthOf(2);
        should(collectionItems[0].offlineArray[0].id).be.a.String().and.eql('_3');
        should(collectionItems[0].offlineArray[1].id).be.a.Number().and.eql(1);
        should(collectionItems[1].id).be.a.String().and.eql('_2');
        should(collectionItems[1].offlineArray).be.an.Array().and.have.lengthOf(3);
        should(collectionItems[1].offlineArray[0].id).be.a.String().and.eql('_2');
        should(collectionItems[1].offlineArray[1].id).be.a.String().and.eql('_4');
        should(collectionItems[1].offlineArray[2].id).be.a.String().and.eql('_3');

        should(lunaris._stores.offlineArraySync.data.getIndexId()).eql({ 1 : 1, _2 : 2, _3 : 3, _4 : 4 });
        should(lunaris._stores.offlineReferenceSync.data.getIndexId()).eql({ _1 : 1, _2 : 2 });
        done();
      });
    });

  });

});
