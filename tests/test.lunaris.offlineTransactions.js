const should                     = require('should');
const computeOfflineTransactions = require('../src/store/store')._computeStoreTransactions;
const resetVersion               = require('../src/store/store.collection').resetVersionNumber;
const collection                 = require('../src/store/store.collection').collection;
const OPERATIONS                 = require('../src/utils').OPERATIONS;
const clone                      = require('../src/utils').clone;

const getPrimaryKey = (val) => {
  return val.id;
};

describe.only('Compute offline transactions', () => {

  beforeEach(() => {
    resetVersion();
  });

  it('should add the transaction', () => {
    let _collection   = collection(null, false);
    let _value        = { id : 1, label : 'A' };
    let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.INSERT, '/test', _value);
    should(_transactions).eql([{
      store   : 'test',
      method  : OPERATIONS.INSERT,
      request : '/test',
      value   : _value
    }]);
  });

  it('should add the transaction at the end of previous transactions', () => {
    let _collection = collection(getPrimaryKey);
    let _valueInit  = {
      store   : 'test',
      method  : OPERATIONS.INSERT,
      request : '/test',
      value   : { id : 1, label : 'A' },
      id      : 1,
      rowId   : 1,
      version : [1]
    };
    _collection.add(_valueInit);
    let _value        = { id : 2, label : 'B' };
    let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.INSERT, '/test', _value);
    should(_transactions).eql([
      _valueInit,
      {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : _value
      }
    ]);
  });

  describe('value = object', () => {
    it('should compute POST->PUT to POST', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.UPDATE, '/test', { _id : 1, id : 1, label : 'B' });
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.INSERT,
        request  : '/test',
        value    : { _id : 1, id : 1, label : 'B' },
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute PUT->PUT to PUT', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.UPDATE, '/test', { _id : 1, id : 1, label : 'B' });
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.UPDATE,
        request  : '/test',
        value    : { _id : 1, id : 1, label : 'B' },
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute POST->PUT->PUT to POST', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.UPDATE, '/test', { _id : 1, id : 1, label : 'B' });
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.INSERT,
        request  : '/test',
        value    : { _id : 1, id : 1, label : 'B' },
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);

      _transactions = computeOfflineTransactions(_transactions, 'test', OPERATIONS.UPDATE, '/test', { _id : 1, id : 1, label : 'C' });
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.INSERT,
        request  : '/test',
        value    : { _id : 1, id : 1, label : 'C' },
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute POST->DELETE to nothing', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.DELETE, '/test', { _id : 1, id : 1, label : 'A' });
      should(_transactions).eql([]);
    });

    it('should compute PUT->DELETE to DELETE', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.DELETE, '/test', { _id : 1, id : 1, label : 'A' });
      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.DELETE,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      }]);
    });

    it('should compute POST->PUT->DELETE to nothing', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      };
      _collection.add(_valueInit);

      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.UPDATE, '/test', { _id : 1, id : 1, label : 'B' });
      _transactions     = computeOfflineTransactions(_transactions, 'test', OPERATIONS.DELETE, '/test', { _id : 1, id : 1, label : 'B' });
      should(_transactions).eql([]);
    });
  });

  describe('value = array', () => {
    it('should compute POST->PUT to POST', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.UPDATE, '/test', [{ _id : 1, id : 1, label : 'B' }]);
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.INSERT,
        request  : '/test',
        value    : [{ _id : 1, id : 1, label : 'B' }],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute POST->PUT to POST : POST has an object value', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.UPDATE, '/test', [{ _id : 1, id : 1, label : 'B' }]);
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.INSERT,
        request  : '/test',
        value    : { _id : 1, id : 1, label : 'B' },
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute POST->PUT to POST : PUT has an object value', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.UPDATE, '/test', { _id : 1, id : 1, label : 'B' });
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.INSERT,
        request  : '/test',
        value    : [{ _id : 1, id : 1, label : 'B' }],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute POST->PUT to POST : multiple items', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' }
        ]
      );
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.INSERT,
        request  : '/test',
        value    : [{ _id : 1, id : 1, label : 'A.1' }, { _id : 2, id : 2, label : 'B.1' }],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute POST->PUT to POST : multiple items and discontinuation', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' }
        ]
      );
      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' },
          { _id : 3, id : 3, label : 'C' }
        ],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute POST->PUT to POST : multiple transactions && multiple items', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' }
        ]
      );

      _transactions = computeOfflineTransactions(
        _transactions,
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 3, id : 3, label : 'C.1' }
        ]
      );

      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' },
          { _id : 3, id : 3, label : 'C.1' }
        ],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });


    it('should compute PUT->PUT to PUT', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.UPDATE, '/test', [{ _id : 1, id : 1, label : 'B' }]);
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.UPDATE,
        request  : '/test',
        value    : [{ _id : 1, id : 1, label : 'B' }],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute PUT->PUT to PUT : first PUT has an object value', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.UPDATE, '/test', [{ _id : 1, id : 1, label : 'B' }]);
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.UPDATE,
        request  : '/test',
        value    : { _id : 1, id : 1, label : 'B' },
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute PUT->PUT to PUT : second PUT has an object value', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.UPDATE, '/test', { _id : 1, id : 1, label : 'B' });
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.UPDATE,
        request  : '/test',
        value    : [{ _id : 1, id : 1, label : 'B' }],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute PUT->PUT to PUT : multiple items', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' }
        ]
      );
      should(_transactions).eql([{
        store    : 'test',
        method   : OPERATIONS.UPDATE,
        request  : '/test',
        value    : [{ _id : 1, id : 1, label : 'A.1' }, { _id : 2, id : 2, label : 'B.1' }],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute PUT->PUT to PUT : multiple items and discontinuation', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' }
        ]
      );
      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' },
          { _id : 3, id : 3, label : 'C' }
        ],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute PUT->PUT to PUT : multiple transactions && multiple items', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' }
        ]
      );

      _transactions = computeOfflineTransactions(
        _transactions,
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 3, id : 3, label : 'C.1' }
        ]
      );

      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' },
          { _id : 3, id : 3, label : 'C.1' }
        ],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute PUT->PUT to PUT : multiple transactions && multiple items', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' }
        ]
      );

      _transactions = computeOfflineTransactions(
        _transactions,
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 3, id : 3, label : 'C.1' }
        ]
      );

      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' },
          { _id : 3, id : 3, label : 'C.1' }
        ],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute POST->PUT to POST->PUT : discontinuations', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 2, id : 2, label : 'B.1' },
          { _id : 3, id : 3, label : 'C'   }
        ]
      );

      should(_transactions).eql([
        {
          store   : 'test',
          method  : OPERATIONS.INSERT,
          request : '/test',
          value   : [
            { _id : 1, id : 1, label : 'A' },
            { _id : 2, id : 2, label : 'B.1' },
          ],
          _id      : 1,
          _rowId   : 1,
          _version : [1]
        },
        {
          store   : 'test',
          method  : OPERATIONS.UPDATE,
          request : '/test',
          value   : [
            { _id : 3, id : 3, label : 'C' }
          ]
        }
      ]);
    });


    it('should compute POST->DELETE to nothing', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.DELETE, '/test', [{ _id : 1, id : 1, label : 'A' }]);
      should(_transactions).eql([]);
    });

    it('should compute POST->DELETE to POST : POST has an object value', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.DELETE, '/test', [{ _id : 1, id : 1, label : 'A' }]);
      should(_transactions).eql([]);
    });

    it('should compute POST->DELETE to nothing : DELETE has an object value', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.DELETE, '/test', { _id : 1, id : 1, label : 'A' });
      should(_transactions).eql([]);
    });

    it('should compute POST->DELETE to nothing : multiple items', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.DELETE,
        '/test', [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' }
        ]
      );
      should(_transactions).eql([]);
    });

    it('should compute POST->DELETE to POST : multiple items and discontinuation', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.DELETE,
        '/test', [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' }
        ]
      );
      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [
          { _id : 3, id : 3, label : 'C' }
        ],
        _id      : 1,
        _rowId   : 1,
        _version : [1]
      }]);
    });

    it('should compute POST->DELETE to nothing : multiple transactions && multiple items', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.DELETE,
        '/test', [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' }
        ]
      );

      _transactions = computeOfflineTransactions(
        _transactions,
        'test',
        OPERATIONS.DELETE,
        '/test', [
          { _id : 3, id : 3, label : 'C' }
        ]
      );

      should(_transactions).eql([]);
    });

    it('should compute PUT->DELETE to DELETE', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.DELETE, '/test', [{ _id : 1, id : 1, label : 'A' }]);
      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.DELETE,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }]
      }]);
    });

    it('should compute PUT->DELETE to DELETE : UPDATE has an object value', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.DELETE, '/test', [{ _id : 1, id : 1, label : 'A' }]);
      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.DELETE,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }]
      }]);
    });

    it('should compute PUT->DELETE to DELETE : PUT has an object value', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(_collection.getAll(), 'test', OPERATIONS.DELETE, '/test', { _id : 1, id : 1, label : 'A' });
      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.DELETE,
        request : '/test',
        value   : { _id : 1, id : 1, label : 'A' }
      }]);
    });

    it('should compute PUT->DELETE to DELETE : multiple items', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.DELETE,
        '/test', [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' }
        ]
      );
      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.DELETE,
        request : '/test',
        value   : [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }]
      }]);
    });

    it('should compute PUT->DELETE to DELETE : multiple items and discontinuation', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.DELETE,
        '/test', [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' }
        ]
      );
      should(_transactions).eql([
        {
          store   : 'test',
          method  : OPERATIONS.UPDATE,
          request : '/test',
          value   : [
            { _id : 3, id : 3, label : 'C' }
          ],
          _id      : 1,
          _rowId   : 1,
          _version : [1]
        },
        {
          store   : 'test',
          method  : OPERATIONS.DELETE,
          request : '/test',
          value   : [
            { _id : 1, id : 1, label : 'A' },
            { _id : 2, id : 2, label : 'B' }
          ]
        }
      ]);
    });

    it('should compute PUT->DELETE to DELETE : multiple transactions && multiple items', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.UPDATE,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.DELETE,
        '/test', [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' }
        ]
      );

      _transactions = computeOfflineTransactions(
        _transactions,
        'test',
        OPERATIONS.DELETE,
        '/test', [
          { _id : 3, id : 3, label : 'C' }
        ]
      );

      should(_transactions).eql([{
        store   : 'test',
        method  : OPERATIONS.DELETE,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      }]);
    });

    it('should compute POST->PUT->DELETE to nothing : multiple transactions && multiple items', () => {
      let _collection = collection(getPrimaryKey);
      let _valueInit  = {
        store   : 'test',
        method  : OPERATIONS.INSERT,
        request : '/test',
        value   : [
          { _id : 1, id : 1, label : 'A' },
          { _id : 2, id : 2, label : 'B' },
          { _id : 3, id : 3, label : 'C' }
        ]
      };
      _collection.add(_valueInit);
      let _transactions = computeOfflineTransactions(
        _collection.getAll(),
        'test',
        OPERATIONS.UPDATE,
        '/test', [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' }
        ]
      );

      _transactions = computeOfflineTransactions(
        _transactions,
        'test',
        OPERATIONS.DELETE,
        '/test', [
          { _id : 1, id : 1, label : 'A.1' },
          { _id : 2, id : 2, label : 'B.1' },
          { _id : 3, id : 3, label : 'C' }
        ]
      );

      should(_transactions).eql([]);
    });

  });

});
