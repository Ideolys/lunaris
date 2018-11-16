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
    lunaris.clear('@test');
    lunaris.clear('@http');
    lunaris.clear('@http.filter');
    setTimeout(done, 50);
  });

  describe('localStorage API', () => {
    it('should set a value', () => {
      lunaris.localStorage.set('test', 1);
      should(lunaris.localStorage.get('test')).eql(1);
    });

    it('should clear a value', () => {
      lunaris.localStorage.set('test', 1);
      lunaris.localStorage.clear('test');
      should(lunaris.localStorage.get('test')).eql(null);
    });
  });

  describe('state', () => {
    it('should update currentVersion state', () => {
      var _collection = lunaris._collection(null, null, null, null, null, null, 'test');
      should(lunaris.localStorage.get('lunaris:versionNumber')).eql(1);
      _collection.add({ id : 1 });
      should(lunaris.localStorage.get('lunaris:versionNumber')).eql(2);
    });

    it('should clear currentVersion state', () => {
      var _collection = lunaris._collection(null, null, null, null, null, null, 'test');
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
            should(data).eql({
              store : 'http',
              cache : [
                [{ limit : 50, offset : 0 }, [1, 2, 3]]
              ],
              collection : {
                currentId     : 4,
                currrentRowId : 4,
                index         : [[1, 2, 3], [1, 2, 3]]
              },
              massOperations : {},
              pagination     : { limit : 50, offset : 50, currentPage : 2 }
            });

            lunaris.removeHook('get@http', _hook);
            done();
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
                store : 'http',
                cache : [
                  [{ limit : 50, offset : 0 }, [1, 2, 3]]
                ],
                collection : {
                  currentId     : 4,
                  currrentRowId : 4,
                  index         : [[1, 2, 3], [1, 2, 3]]
                },
                massOperations : {},
                pagination     : { limit : 50, offset : 50, currentPage : 2 }
              });

              lunaris.offline.isOnline = false;
              lunaris.insert('@http.filter', { label : 'B' });
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
              store : 'http',
              cache : [
                [{ limit : 50, offset : 0 }         , [1, 2, 3]],
                [{ limit : 50, offset : 0, 0 : 'B' }, [2]]
              ],
              collection : {
                currentId     : 4,
                currrentRowId : 4,
                index         : [[1, 2, 3], [1, 2, 3]]
              },
              massOperations : {},
              pagination     : { limit : 50, offset : 50, currentPage : 2 }
            });

            lunaris.offline.isOnline = true;
            lunaris.removeHook('get@http', _getHook);
            lunaris.removeHook('reset@http', _resetHook);

            done();
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
              cache      : [],
              collection : {
                currentId     : 1,
                currrentRowId : 1,
                index         : [[], []]
              },
              massOperations : {},
              pagination     : { limit : 50, offset : 0, currentPage : 1 }
            });

            lunaris._indexedDB.getAll('http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).eql([]);

              lunaris.removeHook('get@http', _hook);
              done();
            });
          });
        }, 40);
      };
      lunaris.hook('get@http', _hook);
      lunaris.get('@http');
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
            cache      : [],
            collection : {
              currentId     : 1,
              currrentRowId : 1,
              index         : [[], []]
            },
            massOperations : {},
            pagination     : { limit : 50, offset : 100, currentPage : 2 }
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
              store : 'http',
              cache : [
                [{ limit : 50, offset : 0 }, [2, 3]]
              ],
              collection : {
                currentId     : 4,
                currrentRowId : 4,
                index         : [[2, 3], [2, 3]]
              },
              massOperations : {},
              pagination     : { limit : 50, offset : 50, currentPage : 2 }
            });

            lunaris.removeHook('get@http', _hook);
            done();
          });
        }, 50);
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
              cache      : [],
              collection : {
                currentId     : 2,
                currrentRowId : 2,
                index         : [[1], [1]]
              },
              massOperations : {},
              pagination     : { limit : 50, offset : 0, currentPage : 1 }
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
        }, 20);
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
            _version : [1, 2]
          });
          should(data[1]).eql({
            id       : 1,
            label    : 'A',
            post     : true,
            _rowId   : 2,
            _id      : 1,
            _version : [2]
          });

          setTimeout(() => {
            lunaris._indexedDB.get('_states', 'http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).be.an.Object();
              should(data).eql({
                store      : 'http',
                cache      : [],
                collection : {
                  currentId     : 2,
                  currrentRowId : 3,
                  index         : [[1], [1]]
                },
                massOperations : {},
                pagination     : { limit : 50, offset : 0, currentPage : 1 }
              });

              lunaris.removeHook('insert@http'  , _insertHook);
              lunaris.removeHook('inserted@http', _insertedHook);
              done();
            });
          }, 60);
        });
      };
      lunaris.hook('insert@http', _insertHook);
      lunaris.hook('inserted@http', _insertedHook);
      lunaris.insert('@http', { id : 1, label : 'A' });
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
              cache      : [],
              collection : {
                currentId     : 2,
                currrentRowId : 2,
                index         : [[1], [1]]
              },
              massOperations : {},
              pagination     : { limit : 50, offset : 0, currentPage : 1 }
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
        }, 20);
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
            _version : [1, 2]
          });
          should(data[1]).eql({
            id       : 1,
            label    : 'A',
            post     : true,
            _rowId   : 2,
            _id      : 1,
            _version : [2]
          });

          setTimeout(() => {
            lunaris._indexedDB.get('_states', 'http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).be.an.Object();
              should(data).eql({
                store      : 'http',
                cache      : [],
                collection : {
                  currentId     : 2,
                  currrentRowId : 3,
                  index         : [[1], [1]]
                },
                massOperations : {},
                pagination     : { limit : 50, offset : 0, currentPage : 1 }
              });

              lunaris.removeHook('insert@http'  , _insertHook);
              lunaris.removeHook('inserted@http', _insertedHook);
              done();
            });
          }, 60);
        });
      };
      lunaris.hook('insert@http', _insertHook);
      lunaris.hook('inserted@http', _insertedHook);
      lunaris.insert('@http', { id : 1, label : 'A' });
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
              cache      : [],
              collection : {
                currentId     : 2,
                currrentRowId : 3,
                index         : [[1], [1]]
              },
              massOperations : {},
              pagination     : { limit : 50, offset : 0, currentPage : 1 }
            });

            setTimeout(() => {
              lunaris._indexedDB.get('_states', 'http', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).be.an.Object();
                should(data).eql({
                  store      : 'http',
                  cache      : [],
                  collection : {
                    currentId     : 2,
                    currrentRowId : 4,
                    index         : [[1], [1]]
                  },
                  massOperations : {},
                  pagination     : { limit : 50, offset : 0, currentPage : 1 }
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
                    _version : [1, 2]
                  });
                  should(data[1]).eql({
                    id       : 1,
                    label    : 'A',
                    post     : true,
                    _rowId   : 2,
                    _id      : 1,
                    _version : [2, 3]
                  });
                  should(data[2]).eql({
                    id       : 1,
                    label    : 'B',
                    _rowId   : 3,
                    _id      : 1,
                    _version : [3]
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
            _version : [4]
          });

          setTimeout(() => {
            lunaris._indexedDB.get('_states', 'http', (err, data) => {
              if (err) {
                done(err);
              }

              should(data).be.an.Object();
              should(data).eql({
                store      : 'http',
                cache      : [],
                collection : {
                  currentId     : 2,
                  currrentRowId : 5,
                  index         : [[1], [1]]
                },
                massOperations : {},
                pagination     : { limit : 50, offset : 0, currentPage : 1 }
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
              cache      : [],
              collection : {
                currentId     : 1,
                currrentRowId : 1,
                index         : [[], []]
              },
              massOperations : {
                label : 'B'
              },
              pagination : { limit : 50, offset : 0, currentPage : 1 }
            });

            setTimeout(() => {
              lunaris._indexedDB.get('_states', 'http', (err, data) => {
                if (err) {
                  done(err);
                }

                should(data).be.an.Object();
                should(data).eql({
                  store      : 'http',
                  cache      : [],
                  collection : {
                    currentId     : 1,
                    currrentRowId : 1,
                    index         : [[], []]
                  },
                  massOperations : {
                    label : 'B'
                  },
                  pagination : { limit : 50, offset : 0, currentPage : 1 }
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
  });

  describe('collection data', () => {

    function getPrimaryKey (obj) {
      return obj.id;
    }

    it('should add the object to the collection data store', done => {
      var _collection = lunaris._collection(null, null, null, null, null, null, 'test');
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
      var _collection = lunaris._collection(null, null, null, null, null, null, 'test');
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
      var _collection = lunaris._collection(null, null, null, null, null, null, 'test');
      _collection.add({ id : 1 });
      _collection.remove(1);
      lunaris._indexedDB.getAll('test', (err, data) => {
        if (err) {
          done(err);
        }

        should(data).be.an.Array().and.have.lengthOf(1);
        should(data[0]).eql({ id : 1, _id : 1, _rowId : 1, _version : [1, 2] });
        done();
      });
    });

    it('should not duplicate values items within the same transaction', done => {
      var _collection = lunaris._collection(getPrimaryKey, null, null, null, null, null, 'test');
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
      var _collection = lunaris._collection(getPrimaryKey, null, null, null, null, null, 'test');
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
      var _collection = lunaris._collection(getPrimaryKey, null, null, null, null, null, 'test');
      var _version = _collection.begin();
      _collection.add({ id : 10 }, _version);
      _collection.remove(1, _version);
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
