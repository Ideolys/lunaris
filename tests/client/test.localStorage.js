describe('local storage', () => {

  before(done => {
    lunaris._indexedDB.init(lunaris.constants.indexedDBNumber, [], (err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  beforeEach(done => {
    lunaris._resetVersionNumber();
    lunaris._indexedDB.clear('_states', () => {
      lunaris.begin();
      lunaris.clear('@test');
      lunaris.clear('@http');
      lunaris.clear('@http.filter');
      lunaris.clear('@lunarisOfflineTransactions');
      lunaris.commit(() => {
        lunaris._indexedDB.clear('_invalidations', () => {
          lunaris._cache.clear();
          lunaris.offline.isOnline      = true;
          lunaris.offline.isOfflineMode = false;
          // setTimeout(done, 200);
          done();
        });
      });
    });
  });

  describe('localStorage API', () => {
    it('should set a value', () => {
      lunaris.localStorage.set('test', 2);
      should(lunaris.localStorage.get('test')).eql(2);
    });

    it('should clear a value', () => {
      lunaris.localStorage.set('test', 1);
      should(lunaris.localStorage.get('test')).eql(1);
      lunaris.localStorage.clear('test');
      should(lunaris.localStorage.get('test')).eql(null);
    });
  });

  describe('state', () => {
    it('should update currentVersion state', () => {
      var _collection = lunaris._collection(null, null, null, null, null, 'test');
      should(lunaris.localStorage.get('lunaris:versionNumber')).eql(1);
      _collection.add({ id : 1 });
      should(lunaris.localStorage.get('lunaris:versionNumber')).eql(2);
    });

    it('should clear currentVersion state', () => {
      var _collection = lunaris._collection(null, null, null, null, null, 'test');
      should(lunaris.localStorage.get('lunaris:versionNumber')).eql(1);
      _collection.add({ id : 1 });
      should(lunaris.localStorage.get('lunaris:versionNumber')).eql(2);
      lunaris._resetVersionNumber();
      should(lunaris.localStorage.get('lunaris:versionNumber')).eql(1);
    });

    it('should have set store _states', done => {
      lunaris._indexedDB.getAll('_states', (err, data) => {
        if (err) {
          done(err);
        }

        should(data).be.an.Array();
        // var _storesLunaris   = Object.keys(lunaris._stores);
        // var _storesIndexedDB = [];
        // for (var i = 0; i < data.length; i++) {
        //   _storesIndexedDB.push(data[i].store);
        // }
        // for (i = 0; i < _storesLunaris.length; i++) {
        //   if (_storesLunaris[i] !== 'lunarisErrors') {
        //     should(_storesIndexedDB.indexOf(_storesLunaris[i])).not.eql(-1);
        //   }
        // }
        done();
      });
    });

    it('should update the state : get', done => {
      var _hook = () => {
        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).be.an.Object();
            should(JSON.stringify(data)).eql(JSON.stringify({
              store          : 'http',
              massOperations : {},
              collection     : {
                currentId       : 4,
                currentRowId    : 4,
                index           : [[1, 2, 3], [1, 2, 3]],
                indexReferences : {}
              }
            }));

            lunaris._indexedDB.getAll('cache', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).eql([
                {
                  hash   : 'fe25fdfff5d2b9ec4d6d4a1231b9427c',
                  values : [
                    { id : 1, label : 'A' },
                    { id : 2, label : 'B' },
                    { id : 3, label : 'C' }
                  ],
                  stores : ['http']
                }
              ]);

              lunaris.removeHook('get@http', _hook);
              done();
            });
          });
        }, 20);
      };
      lunaris.hook('get@http', _hook);
      lunaris.get('@http');
    });

    it('should update the state : get offline', done => {
      var _nbCalled  = 0;
      var _resetHook = () => {
        lunaris.get('@http');
      };
      var _getHook = () => {
        _nbCalled += 1;

        if (_nbCalled === 1) {
          return setTimeout(() => {
            lunaris._indexedDB.get('_states', 'http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).be.an.Object();
              should(data).eql({
                store      : 'http',
                collection : {
                  currentId       : 4,
                  currentRowId    : 4,
                  index           : [[1, 2, 3], [1, 2, 3]],
                  indexReferences : {}
                },
                massOperations : {}
              });

              lunaris._indexedDB.getAll('cache', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).eql([
                  {
                    hash   : 'fe25fdfff5d2b9ec4d6d4a1231b9427c',
                    values : [
                      { id : 1, label : 'A' },
                      { id : 2, label : 'B' },
                      { id : 3, label : 'C' }
                    ],
                    stores : ['http']
                  }
                ]);

                lunaris.offline.isOnline = false;
                lunaris.insert('@http.filter', { label : 'B' });
              });
            });
          }, 20);
        }

        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).be.an.Object();
            should(data).eql({
              store      : 'http',
              collection : {
                currentId       : 4,
                currentRowId    : 4,
                index           : [[1, 2, 3], [1, 2, 3]],
                indexReferences : {}
              },
              massOperations : {}
            });

            lunaris._indexedDB.getAll('cache', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).eql([
                {
                  hash   : '74c398f07f23c189f48657307604c1ea',
                  values : [
                    { id : 2, label : 'B' }
                  ],
                  stores : ['http']
                },
                {
                  hash   : 'fe25fdfff5d2b9ec4d6d4a1231b9427c',
                  values : [
                    { id : 1, label : 'A' },
                    { id : 2, label : 'B' },
                    { id : 3, label : 'C' }
                  ],
                  stores : ['http']
                }
              ]);

              lunaris.offline.isOnline = true;
              lunaris.removeHook('get@http', _getHook);
              lunaris.removeHook('reset@http', _resetHook);
              done();
            });
          });
        }, 100);
      };

      lunaris.hook('reset@http', _resetHook);
      lunaris.hook('get@http', _getHook);

      lunaris.get('@http');
    });

    it('should update the state : get offline mode', done => {
      var _nbCalled  = 0;
      var _resetHook = () => {
        lunaris.get('@http');
      };
      var _getHook = () => {
        _nbCalled += 1;

        if (_nbCalled === 1) {
          return setTimeout(() => {
            lunaris._indexedDB.get('_states', 'http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).be.an.Object();
              should(data).eql({
                store      : 'http',
                collection : {
                  currentId       : 4,
                  currentRowId    : 4,
                  index           : [[1, 2, 3], [1, 2, 3]],
                  indexReferences : {}
                },
                massOperations : {}
              });

              lunaris._indexedDB.getAll('cache', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).eql([
                  {
                    hash   : 'fe25fdfff5d2b9ec4d6d4a1231b9427c',
                    values : [
                      { id : 1, label : 'A' },
                      { id : 2, label : 'B' },
                      { id : 3, label : 'C' }
                    ],
                    stores : ['http']
                  }
                ]);

                lunaris.offline.isOfflineMode = true;
                lunaris.insert('@http.filter', { label : 'B' });
              });
            });
          }, 20);
        }

        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).be.an.Object();
            should(data).eql({
              store      : 'http',
              collection : {
                currentId       : 4,
                currentRowId    : 4,
                index           : [[1, 2, 3], [1, 2, 3]],
                indexReferences : {}
              },
              massOperations : {}
            });

            lunaris._indexedDB.getAll('cache', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).eql([
                {
                  hash   : '74c398f07f23c189f48657307604c1ea',
                  values : [
                    { id : 2, label : 'B' }
                  ],
                  stores : ['http']
                },
                {
                  hash   : 'fe25fdfff5d2b9ec4d6d4a1231b9427c',
                  values : [
                    { id : 1, label : 'A' },
                    { id : 2, label : 'B' },
                    { id : 3, label : 'C' }
                  ],
                  stores : ['http']
                }
              ]);

              lunaris.offline.isOfflineMode = false;
              lunaris.removeHook('get@http', _getHook);
              lunaris.removeHook('reset@http', _resetHook);
              done();
            });
          });
        }, 100);
      };

      lunaris.hook('reset@http', _resetHook);
      lunaris.hook('get@http', _getHook);

      lunaris.get('@http');
    });

    it('should update the state : clear', done => {
      var _hook = () => {
        lunaris.clear('@http');
        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).eql({
              store      : 'http',
              collection : {
                currentId       : 1,
                currentRowId    : 1,
                index           : [[], []],
                indexReferences : {}
              },
              massOperations : {}
            });

            lunaris._indexedDB.getAll('http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).eql([]);
              should(lunaris._stores.http.data.getAll()).have.lengthOf(0);

              lunaris._indexedDB.getAll('cache', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).eql([]);

                lunaris.removeHook('get@http', _hook);
                done();
              });
            });
          });
        }, 80);
      };
      lunaris.hook('get@http', _hook);
      lunaris.get('@http');
    });

    it('should not clear the store when offline', done => {
      var _hook = () => {
        lunaris.offline.isOnline = false;
        lunaris.clear('@http');
        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).eql({
              store      : 'http',
              collection : {
                currentId       : 4,
                currentRowId    : 4,
                index           : [[1, 2, 3], [1, 2, 3]],
                indexReferences : {}
              },
              massOperations : {}
            });

            lunaris._indexedDB.getAll('http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).have.lengthOf(3);
              should(lunaris._stores.http.data.getAll()).have.lengthOf(3);

              lunaris._indexedDB.getAll('cache', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).eql([]);

                lunaris.offline.isOnline = true;
                lunaris.removeHook('get@http', _hook);
                done();
              });
            });
          });
        }, 80);
      };
      lunaris.hook('get@http', _hook);
      lunaris.get('@http');
    });

    it('should not clear the store when offline mode is activated', done => {
      var _hook = () => {
        lunaris.offline.isOfflineMode = true;
        lunaris.clear('@http');
        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).eql({
              store      : 'http',
              collection : {
                currentId       : 4,
                currentRowId    : 4,
                index           : [[1, 2, 3], [1, 2, 3]],
                indexReferences : {}
              },
              massOperations : {}
            });

            lunaris._indexedDB.getAll('http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).have.lengthOf(3);
              should(lunaris._stores.http.data.getAll()).have.lengthOf(3);

              lunaris._indexedDB.getAll('cache', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).eql([]);

                lunaris.offline.isOfflineMode = false;
                lunaris.removeHook('get@http', _hook);
                done();
              });
            });
          });
        }, 80);
      };
      lunaris.hook('get@http', _hook);
      lunaris.get('@http');
    });

    it('should clear the store when offline and store isLocal', done => {
      var _hook = () => {
        lunaris.offline.isOnline = false;
        lunaris.clear('@test');
        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'test', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).eql({
              store      : 'test',
              collection : {
                currentId       : 1,
                currentRowId    : 1,
                index           : [[], []],
                indexReferences : {}
              },
              massOperations : {}
            });

            lunaris._indexedDB.getAll('test', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).have.lengthOf(0);
              should(lunaris._stores.test.data.getAll()).have.lengthOf(0);

              lunaris._indexedDB.getAll('cache', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).eql([]);

                lunaris.offline.isOnline = true;
                lunaris.removeHook('insert@test', _hook);
                done();
              });
            });
          });
        }, 80);
      };
      lunaris.hook('insert@test', _hook);
      lunaris.insert('@test', [{ id : 1 }, { id : 2 }]);
    });

    it('should clear the store when offline mode and store isLocal', done => {
      var _hook = () => {
        lunaris.offline.isOfflineMode = true;
        lunaris.begin();
        lunaris.clear('@test');
        lunaris.commit(() => {
          lunaris._indexedDB.get('_states', 'test', (err, data) => {
            if (err) {
              return done(err);
            }

            should(data).eql({
              store      : 'test',
              collection : {
                currentId       : 1,
                currentRowId    : 1,
                index           : [[], []],
                indexReferences : {}
              },
              massOperations : {}
            });

            lunaris._indexedDB.getAll('test', (err, data) => {
              if (err) {
                return done(err);
              }

              should(data).have.lengthOf(0);
              should(lunaris._stores.test.data.getAll()).have.lengthOf(0);

              lunaris._indexedDB.getAll('cache', (err, data) => {
                if (err) {
                  return done(err);
                }

                should(data).eql([]);

                lunaris.offline.isOfflineMode = false;
                lunaris.removeHook('insert@test', _hook);
                done();
              });
            });
          });
        });
      };
      lunaris.hook('insert@test', _hook);
      lunaris.insert('@test', [{ id : 1 }, { id : 2 }]);
    });

    it('should update the state : setPagination', done => {
      lunaris.setPagination('@http', 2);
      setTimeout(() => {
        lunaris._indexedDB.get('_states', 'http', (err, data) => {
          if (err) {
            done(err);
          }

          should(data).eql({
            store      : 'http',
            collection : {
              currentId       : 1,
              currentRowId    : 1,
              index           : [[], []],
              indexReferences : {}
            },
            massOperations : {}
          });

          lunaris._indexedDB.getAll('http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).eql([]);
            done();
          });
        });
      }, 40);
    });

    it('should update the state : delete', done => {
      var _hook = () => {
        lunaris.delete('@http', { _id : 1 });
        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).eql({
              store      : 'http',
              collection : {
                currentId       : 4,
                currentRowId    : 4,
                index           : [[2, 3], [2, 3]],
                indexReferences : {}
              },
              massOperations : {}
            });

            lunaris._indexedDB.getAll('cache', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).eql([]);

              lunaris.removeHook('get@http', _hook);
              done();
            });
          });
        }, 60);
      };
      lunaris.hook('get@http', _hook);
      lunaris.get('@http');
    });

    it('should save the HTTP transaction : delete offline', done => {
      var _hook = () => {
        lunaris.offline.isOnline = false;
        lunaris.delete('@http', { _id : 1 });
        setTimeout(() => {
          lunaris._indexedDB.getAll('lunarisOfflineTransactions', (err, data) => {
            should(data).be.an.Array().and.have.lengthOf(1);
            should(data[0].method).eql('DELETE');
            should(data[0].store).eql('http');
            should(data[0].url).eql('/http/1');
            should(data[0].data).eql({
              _id      : 1,
              _rowId   : 1,
              _version : [1, 3],
              id       : 1,
              label    : 'A'
            });

            lunaris.offline.isOnline = true;
            lunaris.removeHook('get@http', _hook);
            done();
          });
        }, 200);
      };
      lunaris.hook('get@http', _hook);
      lunaris.get('@http');
    });

    it('should save the HTTP transaction : delete offline mode', done => {
      var _hook = () => {
        lunaris.offline.isOfflineMode = true;
        lunaris.delete('@http', { _id : 1 });
        setTimeout(() => {
          lunaris._indexedDB.getAll('lunarisOfflineTransactions', (err, data) => {
            should(data).be.an.Array().and.have.lengthOf(1);
            should(data[0].method).eql('DELETE');
            should(data[0].store).eql('http');
            should(data[0].url).eql('/http/1');
            should(data[0].data).eql({
              _id      : 1,
              _rowId   : 1,
              _version : [1, 3],
              id       : 1,
              label    : 'A'
            });

            lunaris.offline.isOfflineMode = false;
            lunaris.removeHook('get@http', _hook);
            done();
          });
        }, 200);
      };
      lunaris.hook('get@http', _hook);
      lunaris.get('@http');
    });

    it('should update the state : insert', done => {
      var _insertHook = () => {
        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).be.an.Object();
            should(data).eql({
              store      : 'http',
              collection : {
                currentId       : 2,
                currentRowId    : 2,
                index           : [[1], [1]],
                indexReferences : {}
              },
              massOperations : {}
            });


            lunaris._indexedDB.getAll('http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).be.an.Array().and.have.lengthOf(1);
              should(data[0]).eql({
                id       : 1,
                label    : 'A',
                _rowId   : 1,
                _id      : 1,
                _version : [1]
              });
            });
          });
        }, 0);
      };
      var _insertedHook = () => {
        lunaris._indexedDB.getAll('http', (err, data) => {
          if (err) {
            done(err);
          }

          should(data).be.an.Array().and.have.lengthOf(2);
          should(data[0]).eql({
            id       : 1,
            label    : 'A',
            _rowId   : 1,
            _id      : 1,
            _version : [1, 3]
          });
          should(data[1]).eql({
            id       : 1,
            label    : 'A',
            post     : true,
            _rowId   : 2,
            _id      : 1,
            _version : [3]
          });

          setTimeout(() => {
            lunaris._indexedDB.get('_states', 'http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).be.an.Object();
              should(data).eql({
                store      : 'http',
                collection : {
                  currentId       : 2,
                  currentRowId    : 3,
                  index           : [[1], [1]],
                  indexReferences : {}
                },
                massOperations : {}
              });

              lunaris.removeHook('insert@http'  , _insertHook);
              lunaris.removeHook('inserted@http', _insertedHook);
              done();
            });
          }, 100);
        });
      };
      lunaris.hook('insert@http', _insertHook);
      lunaris.hook('inserted@http', _insertedHook);
      lunaris.insert('@http', { id : 1, label : 'A' });
    });

    it('should save the HTTP transaction : insert offline', done => {
      var _insertHook = () => {
        setTimeout(() => {
          lunaris._indexedDB.getAll('lunarisOfflineTransactions', (err, data) => {
            should(data).be.an.Array().and.have.lengthOf(1);
            should(data[0].method).eql('POST');
            should(data[0].store).eql('http');
            should(data[0].url).eql('/http');
            should(data[0].data).eql({
              _id      : 1,
              _rowId   : 1,
              _version : [1],
              id       : 1,
              label    : 'A'
            });

            lunaris.offline.isOnline = true;
            lunaris.removeHook('insert@http', _insertHook);
            done();
          });
        }, 0);
      };

      lunaris.offline.isOnline = false;
      lunaris.hook('insert@http', _insertHook);
      lunaris.insert('@http', { id : 1, label : 'A' });
    });

    it('should save the HTTP transaction : insert offline mode', done => {
      var _insertHook = () => {
        setTimeout(() => {
          lunaris._indexedDB.getAll('lunarisOfflineTransactions', (err, data) => {
            should(data).be.an.Array().and.have.lengthOf(1);
            should(data[0].method).eql('POST');
            should(data[0].store).eql('http');
            should(data[0].url).eql('/http');
            should(data[0].data).eql({
              _id      : 1,
              _rowId   : 1,
              _version : [1],
              id       : 1,
              label    : 'A'
            });

            lunaris.offline.isOfflineMode = false;
            lunaris.removeHook('insert@http', _insertHook);
            done();
          });
        }, 20);
      };

      lunaris.offline.isOfflineMode = true;
      lunaris.hook('insert@http', _insertHook);
      lunaris.insert('@http', { id : 1, label : 'A' });
    });

    it('should not save the HTTP transaction : insert offline (local store)', done => {
      var _insertHook = () => {
        setTimeout(() => {
          lunaris._indexedDB.getAll('lunarisOfflineTransactions', (err, data) => {
            should(data).be.an.Array().and.have.lengthOf(0);

            lunaris.offline.isOnline = true;
            lunaris.removeHook('insert@test', _insertHook);
            done();
          });
        }, 0);
      };

      lunaris.offline.isOnline = false;
      lunaris.hook('insert@test', _insertHook);
      lunaris.insert('@test', { id : 1, label : 'A' });
    });

    it('should not save the HTTP transaction : insert offline mode (local store)', done => {
      var _insertHook = () => {
        setTimeout(() => {
          lunaris._indexedDB.getAll('lunarisOfflineTransactions', (err, data) => {
            should(data).be.an.Array().and.have.lengthOf(0);

            lunaris.offline.isOfflineMode = false;
            lunaris.removeHook('insert@test', _insertHook);
            done();
          });
        }, 0);
      };

      lunaris.offline.isOfflineMode = true;
      lunaris.hook('insert@test', _insertHook);
      lunaris.insert('@test', { id : 1, label : 'A' });
    });

    it('should update the state : update', done => {
      var _insertedHook = () => {
        setTimeout(() => {
          lunaris.update('@http', { _id : 1, id : 1, label : 'B' });
        }, 100);
      };
      var _nbCalls    = 0;
      var _updateHook = () => {
        _nbCalls++;

        if (_nbCalls > 1) {
          return;
        }

        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).be.an.Object();
            should(data).eql({
              store      : 'http',
              collection : {
                currentId       : 2,
                currentRowId    : 3,
                index           : [[1], [1]],
                indexReferences : {}
              },
              massOperations : {}
            });

            setTimeout(() => {
              lunaris._indexedDB.get('_states', 'http', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).be.an.Object();
                should(data).eql({
                  store      : 'http',
                  collection : {
                    currentId       : 2,
                    currentRowId    : 4,
                    index           : [[1], [1]],
                    indexReferences : {}
                  },
                  massOperations : {}
                });

                lunaris._indexedDB.getAll('http', (err, data) => {
                  if (err) {
                    done(err);
                  }

                  should(data).be.an.Array().and.have.lengthOf(3);
                  should(data[0]).eql({
                    id       : 1,
                    label    : 'A',
                    _rowId   : 1,
                    _id      : 1,
                    _version : [1, 3]
                  });
                  should(data[1]).eql({
                    id       : 1,
                    label    : 'A',
                    post     : true,
                    _rowId   : 2,
                    _id      : 1,
                    _version : [3, 5]
                  });
                  should(data[2]).eql({
                    id       : 1,
                    label    : 'B',
                    _rowId   : 3,
                    _id      : 1,
                    _version : [5]
                  });
                });
              });
            }, 40);
          });
        }, 60);
      };
      var _updatedHook = () => {
        lunaris._indexedDB.getAll('http', (err, data) => {
          if (err) {
            done(err);
          }

          should(data).be.an.Array().and.have.lengthOf(4);
          should(data[3]).eql({
            id       : 1,
            label    : 'B',
            put      : true,
            _rowId   : 4,
            _id      : 1,
            _version : [7]
          });

          setTimeout(() => {
            lunaris._indexedDB.get('_states', 'http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).be.an.Object();
              should(data).eql({
                store      : 'http',
                collection : {
                  currentId       : 2,
                  currentRowId    : 5,
                  index           : [[1], [1]],
                  indexReferences : {}
                },
                massOperations : {}
              });

              lunaris.removeHook('inserted@http', _insertedHook);
              lunaris.removeHook('update@http'  , _updateHook);
              lunaris.removeHook('updated@http' , _updatedHook);
              done();
            });
          }, 60);
        });
      };
      lunaris.hook('inserted@http', _insertedHook);
      lunaris.hook('update@http', _updateHook);
      lunaris.hook('updated@http', _updatedHook);
      lunaris.insert('@http', { id : 1, label : 'A' });
    });

    it('should save the HTTP transaction : update offline', done => {
      var _insertHook = (item) => {
        item       = lunaris.utils.clone(item[0]);
        item.label = 'A.1';

        lunaris.update('@http', item);
      };

      var _updateHook = () => {
        setTimeout(() => {
          lunaris._indexedDB.getAll('lunarisOfflineTransactions', (err, data) => {
            should(data).be.an.Array().and.have.lengthOf(1);
            should(data[0].method).eql('POST');
            should(data[0].store).eql('http');
            should(data[0].url).eql('/http');
            should(data[0].data).eql({
              _id      : 1,
              _rowId   : 2,
              _version : [4],
              id       : 1,
              label    : 'A.1'
            });

            lunaris.offline.isOnline = true;
            lunaris.removeHook('insert@http', _insertHook);
            lunaris.removeHook('update@http', _updateHook);
            done();
          });
        }, 60);
      };

      lunaris.offline.isOnline = false;

      lunaris.hook('insert@http', _insertHook);
      lunaris.hook('update@http', _updateHook);
      lunaris.insert('@http', { id : 1, label : 'A' });
    });

    it('should save the HTTP transaction : update offline mode', done => {
      var _insertHook = (item) => {
        item       = lunaris.utils.clone(item[0]);
        item.label = 'A.1';

        lunaris.update('@http', item);
      };

      var _updateHook = () => {
        setTimeout(() => {
          lunaris._indexedDB.getAll('lunarisOfflineTransactions', (err, data) => {
            should(data).be.an.Array().and.have.lengthOf(1);
            should(data[0].method).eql('POST');
            should(data[0].store).eql('http');
            should(data[0].url).eql('/http');
            should(data[0].data).eql({
              _id      : 1,
              _rowId   : 2,
              _version : [4],
              id       : 1,
              label    : 'A.1'
            });

            lunaris.offline.isOfflineMode = false;
            lunaris.removeHook('insert@http', _insertHook);
            lunaris.removeHook('update@http', _updateHook);
            done();
          });
        }, 60);
      };

      lunaris.offline.isOfflineMode = true;

      lunaris.hook('insert@http', _insertHook);
      lunaris.hook('update@http', _updateHook);
      lunaris.insert('@http', { id : 1, label : 'A' });
    });

    it('should not save the HTTP transaction : update offline (local store)', done => {
      var _insertHook = (item) => {
        item       = lunaris.utils.clone(item[0]);
        item.label = 'A.1';

        lunaris.update('@test', item);
      };

      var _updateHook = function hook () {
        setTimeout(() => {
          lunaris._indexedDB.getAll('lunarisOfflineTransactions', (err, data) => {
            should(data).be.an.Array().and.have.lengthOf(0);

            lunaris.offline.isOnline = true;
            lunaris.removeHook('insert@test', _insertHook);
            lunaris.removeHook('update@test', _updateHook);
            done();
          });
        }, 60);
      };

      lunaris.offline.isOnline = false;

      lunaris.hook('insert@test', _insertHook);
      lunaris.hook('update@test', _updateHook);
      lunaris.insert('@test', { id : 1, label : 'A' });
    });

    it('should not save the HTTP transaction : update offline mode (local store)', done => {
      var _insertHook = (item) => {
        item       = lunaris.utils.clone(item[0]);
        item.label = 'A.1';

        lunaris.update('@test', item);
      };

      var _updateHook = () => {
        setTimeout(() => {
          lunaris._indexedDB.getAll('lunarisOfflineTransactions', (err, data) => {
            should(data).be.an.Array().and.have.lengthOf(0);

            lunaris.offline.isOfflineMode = false;
            lunaris.removeHook('insert@test', _insertHook);
            lunaris.removeHook('update@test', _updateHook);
            done();
          });
        }, 60);
      };

      lunaris.offline.isOfflineMode = true;

      lunaris.hook('insert@test', _insertHook);
      lunaris.hook('update@test', _updateHook);
      lunaris.insert('@test', { id : 1, label : 'A' });
    });

    it('should update the state : mass update', done => {
      var _patchedHook = () => {
        setTimeout(() => {
          lunaris._indexedDB.get('_states', 'http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).be.an.Object();
            should(data).eql({
              store      : 'http',
              collection : {
                currentId       : 1,
                currentRowId    : 1,
                index           : [[], []],
                indexReferences : {}
              },
              massOperations : {
                label : 'B'
              }
            });

            setTimeout(() => {
              lunaris._indexedDB.get('_states', 'http', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).be.an.Object();
                should(data).eql({
                  store      : 'http',
                  collection : {
                    currentId       : 1,
                    currentRowId    : 1,
                    index           : [[], []],
                    indexReferences : {}
                  },
                  massOperations : {
                    label : 'B'
                  }
                });

                lunaris._indexedDB.getAll('http', (err, data) => {
                  if (err) {
                    done(err);
                  }

                  should(data).be.an.Array().and.have.lengthOf(0);
                  lunaris.removeHook('patched@http', _patchedHook);
                  done();
                });
              });
            }, 40);
          });
        }, 80);
      };

      lunaris.hook('patched@http', _patchedHook);
      lunaris.update('@http:label', 'B');
    });

    it('should set state when init lunaris', done => {
      var _hook = () => {
        setTimeout(() => {
          var _lunaris = lunarisInstance();
          var _store   = 'http';
          setTimeout(() => {
            should(_lunaris._stores[_store].data.getIndexId()).eql([[1, 2, 3], [1, 2, 3]]);
            should(_lunaris._stores[_store].data.getCurrentId()).eql(4);
            should(_lunaris._stores[_store].data.getCurrentRowId()).eql(4);
            should(_lunaris._stores[_store].data.getAll()).eql([
              { id : 1, label : 'A', _rowId : 1, _id : 1, _version : [1] },
              { id : 2, label : 'B', _rowId : 2, _id : 2, _version : [1] },
              { id : 3, label : 'C', _rowId : 3, _id : 3, _version : [1] }
            ]);
            should(_lunaris._stores[_store].massOperations).eql({});

            should(_lunaris._cache._cache()).eql([
              {
                hash   : 'fe25fdfff5d2b9ec4d6d4a1231b9427c',
                values : [
                  { id : 1, label : 'A' },
                  { id : 2, label : 'B' },
                  { id : 3, label : 'C' }
                ],
                stores : ['http']
              }
            ]);

            lunaris.removeHook('get@http', _hook);
            done();
          }, 800);
        }, 200);
      };
      lunaris.hook('get@http', _hook);
      lunaris.get('@http');
    });

    it('should load a store', done => {
      var _hook = () => {
        lunaris._indexedDB.get('_states', 'http', (err, data) => {
          if (err) {
            return done(err);
          }

          should(data).be.an.Object();
          should(JSON.stringify(data)).eql(JSON.stringify({
            store          : 'http',
            massOperations : {},
            collection     : {
              currentId       : 4,
              currentRowId    : 4,
              index           : [[1, 2, 3], [1, 2, 3]],
              indexReferences : {}
            }
          }));

          lunaris.offline.isOfflineMode = false;
          lunaris.removeHook('loaded@http', _hook);
          done();
        });
      };

      lunaris.hook('loaded@http', _hook);
      lunaris.offline.isOfflineMode = true;
      lunaris.load('@http');
    });

    describe('invalidate', () => {
      it('should init invalidations', done => {
        lunaris._indexedDB.upsert('_invalidations', { url : 'GET /all', date : Date.now() });
        lunaris.initInvalidations(() => {
          should(lunaris.invalidations).be.an.Object();
          should(lunaris.invalidations['GET /all']).be.ok();
          lunaris._indexedDB.clear('_invalidations', done);
        });
      });

      it('should invalidate a store from the server', done => {
        var _insertedHook = () => {
          lunaris._indexedDB.getAll('http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).be.an.Array().and.have.lengthOf(2);
            should(data[0]).eql({
              id       : 1,
              label    : 'A',
              _rowId   : 1,
              _id      : 1,
              _version : [1, 3]
            });
            should(data[1]).eql({
              id       : 1,
              label    : 'A',
              post     : true,
              _rowId   : 2,
              _id      : 1,
              _version : [3]
            });

            lunaris.websocket.send('INVALIDATE', 'GET /http', true);

            setTimeout(() => {
              lunaris._indexedDB.getAll('http', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).be.an.Array().and.have.lengthOf(0);

                lunaris._indexedDB.get('_states', 'http', (err, data) => {
                  if (err) {
                    return done(err);
                  }

                  should(data).be.an.Object();
                  should(data).eql({
                    store      : 'http',
                    collection : {
                      currentId       : 1,
                      currentRowId    : 1,
                      index           : [[], []],
                      indexReferences : {}
                    },
                    massOperations : {}
                  });

                  lunaris.removeHook('inserted@http', _insertedHook);
                  done();
                });
              });
            }, 100);
          });
        };

        lunaris.hook('inserted@http', _insertedHook);
        lunaris.insert('@http', { id : 1, label : 'A' });
      });

      it('should invalidate the cache when a store is invalidated from the server', done => {
        var _getHook = () => {
          var _isKeyInTheCache = false;
          var _cache = lunaris._cache._cache();
          for (var i = _cache.length - 1; i >= 0; i--) {
            if (_cache[i].stores.indexOf('http') !== -1) {
              _isKeyInTheCache = true;
              break;
            }
          }

          should(_isKeyInTheCache).eql(true);

          lunaris.websocket.send('INVALIDATE', 'GET /http', true);

          setTimeout(() => {
            _isKeyInTheCache = false;
            _cache           = lunaris._cache._cache();
            for (var i = _cache.length - 1; i >= 0; i--) {
              if (_cache[i].stores.indexOf('http') !== -1) {
                _isKeyInTheCache = true;
                break;
              }
            }
            should(_isKeyInTheCache).eql(false);
            lunaris.removeHook('get@http', _getHook);
            done();
          }, 100);
        };

        lunaris.hook('get@http', _getHook);
        lunaris.get('@http');
      });

      it('should invalidate the cache at app loading when invalidation client < invalidation server', done => {
        var _hook = () => {
          setTimeout(() => {

            let dateInvalidation = Date.now() - 20000;

            lunaris._indexedDB.upsert('_invalidations', { url : 'GET /http', date : dateInvalidation }, () => {
              var _lunaris = lunarisInstance();
              var _store   = 'http';
              setTimeout(() => {
                should(_lunaris._stores[_store].data.getIndexReferences()).eql({});
                should(_lunaris._stores[_store].data.getIndexId()).eql([[], []]);
                should(_lunaris._stores[_store].data.getCurrentId()).eql(1);
                should(_lunaris._stores[_store].data.getCurrentRowId()).eql(1);
                should(_lunaris._stores[_store].data.getAll()).eql([]);
                should(_lunaris._stores[_store].massOperations).eql({});

                should(_lunaris._cache._cache()).eql([]);

                lunaris._indexedDB.get('_invalidations', 'GET /http', (err, invalidation) => {
                  should(invalidation.date).be.aboveOrEqual(dateInvalidation); // should be nearly Date.now()
                  lunaris.removeHook('get@http', _hook);
                  done();
                });
              }, 700);
            });
          }, 200);
        };
        lunaris.hook('get@http', _hook);
        lunaris.get('@http');
      });

      it('should not invalidate the cache at app loading when invalidation client does not exist', done => {
        var _hook = () => {
          setTimeout(() => {

            lunaris._indexedDB.del('_invalidations', 'GET /http', () => {
              var _lunaris = lunarisInstance();
              var _store   = 'http';
              setTimeout(() => {
                should(_lunaris._stores[_store].data.getIndexId()).eql([[1, 2, 3], [1, 2, 3]]);
                should(_lunaris._stores[_store].data.getIndexReferences()).eql({});
                should(_lunaris._stores[_store].data.getCurrentId()).eql(4);
                should(_lunaris._stores[_store].data.getCurrentRowId()).eql(4);
                should(_lunaris._stores[_store].data.getAll()).eql([
                  { id : 1, label : 'A', _rowId : 1, _id : 1, _version : [1] },
                  { id : 2, label : 'B', _rowId : 2, _id : 2, _version : [1] },
                  { id : 3, label : 'C', _rowId : 3, _id : 3, _version : [1] }
                ]);
                should(_lunaris._stores[_store].massOperations).eql({});

                should(_lunaris._cache._cache()).eql([
                  {
                    hash   : 'fe25fdfff5d2b9ec4d6d4a1231b9427c',
                    values : [
                      { id : 1, label : 'A' },
                      { id : 2, label : 'B' },
                      { id : 3, label : 'C' }
                    ],
                    stores : ['http']
                  }
                ]);

                lunaris.removeHook('get@http', _hook);
                done();
              }, 700);
            });
          }, 200);
        };
        lunaris.hook('get@http', _hook);
        lunaris.get('@http');
      });

      it('should not invalidate a store from the server when the app is in offline mode', done => {
        var _insertedHook = () => {
          lunaris._indexedDB.getAll('http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).be.an.Array().and.have.lengthOf(2);
            should(data[0]).eql({
              id       : 1,
              label    : 'A',
              _rowId   : 1,
              _id      : 1,
              _version : [1, 3]
            });
            should(data[1]).eql({
              id       : 1,
              label    : 'A',
              post     : true,
              _rowId   : 2,
              _id      : 1,
              _version : [3]
            });

            lunaris.offline.isOfflineMode = true;
            lunaris.websocket.send('INVALIDATE', 'GET /http', true);

            setTimeout(() => {
              lunaris._indexedDB.getAll('http', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).be.an.Array().and.have.lengthOf(2);

                lunaris._indexedDB.get('_states', 'http', (err, data) => {
                  if (err) {
                    return done(err);
                  }

                  should(data).be.an.Object();
                  should(data).eql({
                    store          : 'http',
                    massOperations : {},
                    collection     : {
                      currentId       : 2,
                      currentRowId    : 3,
                      index           : [[1], [1]],
                      indexReferences : {}
                    }
                  });

                  lunaris.removeHook('inserted@http', _insertedHook);
                  lunaris.offline.isOfflineMode = false;
                  done();
                });
              });
            }, 100);
          });
        };

        lunaris.hook('inserted@http', _insertedHook);
        lunaris.insert('@http', { id : 1, label : 'A' });
      });

      it('should send a custom event when invalidating', done => {
        var _insertedHook = () => {
          lunaris._indexedDB.getAll('http', (err, data) => {
            if (err) {
              done(err);
            }

            should(data).be.an.Array().and.have.lengthOf(2);
            should(data[0]).eql({
              id       : 1,
              label    : 'A',
              _rowId   : 1,
              _id      : 1,
              _version : [1, 3]
            });
            should(data[1]).eql({
              id       : 1,
              label    : 'A',
              post     : true,
              _rowId   : 2,
              _id      : 1,
              _version : [3]
            });

            lunaris.offline.isOfflineMode = true;

            let hook = (url) => {
              should(url).eql('GET /http');
              lunaris._onInvalidate('invalidate', null);
              lunaris.removeHook('inserted@http', _insertedHook);
              lunaris.offline.isOfflineMode = false;
              done();
            };

            lunaris._onInvalidate('invalidate', hook);

            lunaris.websocket.send('INVALIDATE', 'GET /http', true);
          });
        };

        lunaris.hook('inserted@http', _insertedHook);
        lunaris.insert('@http', { id : 1, label : 'A' });
      });
    });

  });

  describe('collection data', () => {

    function getPrimaryKey (obj) {
      return obj.id;
    }

    it('should add the object to the collection data store', done => {
      var _collection = lunaris._collection(null, null, null, null, null, 'test', null, lunaris.utils.clone);
      _collection.add({ id : 1 });
      lunaris._indexedDB.getAll('test', (err, data) => {
        if (err) {
          done(err);
        }

        should(data).be.an.Array().and.have.lengthOf(1);
        should(data[0]).eql({ id : 1, _id : 1, _rowId : 1, _version : [1] });
        done();
      });
    });

    it('should add the updaded object to the collection data store', done => {
      var _collection = lunaris._collection(null, null, null, null, null, 'test', null, lunaris.utils.clone);
      _collection.add({ id : 1 });
      _collection.upsert({ _id : 1, id : 2 });
      lunaris._indexedDB.getAll('test', (err, data) => {
        if (err) {
          done(err);
        }

        should(data).be.an.Array().and.have.lengthOf(2);
        should(data[0]).eql({ id : 1, _id : 1, _rowId : 1, _version : [1, 2] });
        should(data[1]).eql({ id : 2, _id : 1, _rowId : 2, _version : [2] });
        done();
      });
    });

    it('should update the collection data store when deleting', done => {
      var _collection = lunaris._collection(null, null, null, null, null, 'test', null, lunaris.utils.clone);
      _collection.add({ id : 1 });
      _collection.remove({ _id : 1, id : 1 });
      setTimeout(() => {
        lunaris._indexedDB.getAll('test', (err, data) => {
          if (err) {
            done(err);
          }

          should(data).be.an.Array().and.have.lengthOf(1);
          should(data[0]).eql({ id : 1, _id : 1, _rowId : 1, _version : [1, 2] });
          done();
        });
      }, 20);
    });

    it('should not duplicate values items within the same transaction', done => {
      var _collection = lunaris._collection(getPrimaryKey, null, null, null, null, 'test', null, lunaris.utils.clone);
      var _version = _collection.begin();
      _collection.add({ id : 10 }, _version);
      _collection.add({ id : 10 }, _version);
      _collection.commit(_version);

      lunaris._indexedDB.getAll('test', (err, data) => {
        if (err) {
          done(err);
        }

        should(data).be.an.Array().and.have.lengthOf(1);
        should(data[0]).eql({ id : 10, _id : 1, _rowId : 2, _version : [1] });
        done();
      });
    });

    it('should not duplicate values items not in the same transaction', done => {
      var _collection = lunaris._collection(getPrimaryKey, null, null, null, null, 'test', null, lunaris.utils.clone);
      _collection.add({ id : 10, label : 'A' });
      _collection.add({ id : 10, label : 'B' });
      lunaris._indexedDB.getAll('test', (err, data) => {
        if (err) {
          done(err);
        }

        should(data).be.an.Array().and.have.lengthOf(2);
        should(data[0]).eql({ id : 10, label : 'A', _id : 1, _rowId : 1, _version : [1, 3] });
        should(data[1]).eql({ id : 10, label : 'B', _id : 1, _rowId : 2, _version : [3] });
        done();
      });
    });

    it('should not add values if insert / delete in the same transaction', done => {
      var _collection = lunaris._collection(getPrimaryKey, null, null, null, null, 'test', null, lunaris.utils.clone);
      var _version = _collection.begin();
      _collection.add({ id : 10 }, _version);
      _collection.remove({ id : 10 }, _version, true);
      _collection.commit(_version);
      lunaris._indexedDB.getAll('test', (err, data) => {
        if (err) {
          done(err);
        }

        should(data).be.an.Array().and.have.lengthOf(0);
        done();
      });
    });
  });
});
