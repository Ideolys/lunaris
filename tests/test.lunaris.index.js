const utils              = require('../src/utils');
const http               = require('../src/http');
const localStorageDriver = require('../src/localStorageDriver');
const lunarisExports     = require('../src/exports');
lunarisExports.isBrowser = false;
const cache              = require('../src/cache');

const stopWordsFR        = require('stopword').fr;
lunarisExports.stopwords = stopWordsFR;

const index = require('../src/index');

describe('lunaris index', () => {
  it('_stores should be defined', () => {
    should(index._stores).be.ok();
    should(index._stores).be.an.Object().and.eql(require('../src/exports.js')._stores);
  });

  it('utils should be defined', () => {
    should(index.utils).be.ok();
    should(index.utils).be.a.Object();
  });

  it('hook() should be defined', () => {
    should(index.hook).be.ok();
    should(index.hook).be.a.Function();
  });

  it('removeHook() should be defined', () => {
    should(index.removeHook).be.ok();
    should(index.removeHook).be.a.Function();
  });

  it('pushToHandlers() should be defined', () => {
    should(index.pushToHandlers).be.ok();
    should(index.pushToHandlers).be.a.Function();
  });

  it('get() should be defined', () => {
    should(index.get).be.ok();
    should(index.get).be.a.Function();
  });

  it('getOne() should be defined', () => {
    should(index.getOne).be.ok();
    should(index.getOne).be.a.Function();
  });

  it('insert() should be defined', () => {
    should(index.insert).be.ok();
    should(index.insert).be.a.Function();
  });

  it('update() should be defined', () => {
    should(index.update).be.ok();
    should(index.update).be.a.Function();
  });

  it('upsert() should be defined', () => {
    should(index.upsert).be.ok();
    should(index.upsert).be.a.Function();
  });

  it('delete() should be defined', () => {
    should(index.delete).be.ok();
    should(index.delete).be.a.Function();
  });

  it('clear() should be defined', () => {
    should(index.clear).be.ok();
    should(index.clear).be.a.Function();
  });

  it('_collection() should be defined', () => {
    should(index._collection).be.ok();
    should(index._collection).be.a.Function();
  });

  it('_cache() should be defined', () => {
    should(index._cache).be.ok();
    should(index._cache).be.an.Object();
  });

  it('OPERATIONS should be defined', () => {
    should(index.OPERATIONS).be.ok();
    should(index.OPERATIONS).be.an.Object();
    should(index.OPERATIONS).eql(utils.OPERATIONS);
  });

  it('logger should be defined', () => {
    should(index.logger).be.ok();
    should(index.logger).be.an.Object();
    should(index.logger).eql(require('../src/logger'));
  });

  it('rollback() should be defined', () => {
    should(index.rollback).be.ok();
    should(index.rollback).be.a.Function();
  });

  it('getDefaultValue() should be defined', () => {
    should(index.getDefaultValue).be.ok();
    should(index.getDefaultValue).be.a.Function();
  });

  it('_resetVersionNumber() should be defined', () => {
    should(index._resetVersionNumber).be.ok();
    should(index._resetVersionNumber).be.a.Function();
  });

  it('validate() should be defined', () => {
    should(index.validate).be.ok();
    should(index.validate).be.a.Function();
  });

  it('setPagination() should be defined', () => {
    should(index.setPagination).be.ok();
    should(index.setPagination).be.a.Function();
  });

  it('createUrl() should be defined', () => {
    should(index.createUrl).be.ok();
    should(index.createUrl).be.a.Function();
  });

  it('begin() should be defined', () => {
    should(index.begin).be.ok();
    should(index.begin).be.a.Function();
  });

  it('commit() should be defined', () => {
    should(index.commit).be.ok();
    should(index.commit).be.a.Function();
  });

  it('http should be defined', () => {
    should(index.http).be.ok();
    should(index.http).eql(http);
  });

  it('constants should be defined', () => {
    should(index.constants).be.ok();
    should(index.constants).be.an.Object();
  });

  it('offline should be defined', () => {
    should(index.offline).be.ok();
    should(index.offline).be.an.Object();
    should(index.offline.isOnline).be.a.Boolean();
  });

  it('_indexedDB() should be defined', () => {
    should(index._indexedDB).be.ok();
    should(index._indexedDB).be.an.Object();
    should(index._indexedDB).eql(localStorageDriver.indexedDB);
  });

  it('localStorage should be defined', () => {
    should(index.localStorage).be.ok();
    should(index.localStorage).be.an.Object();
    should(index.localStorage).eql(localStorageDriver.localStorage);
  });

  it('pushOfflineHttpTransactions should be defined', () => {
    should(index.offline.pushOfflineHttpTransactions).be.a.Function();
  });

  it('getLastSyncDate should be defined', () => {
    should(index.offline.getLastSyncDate).be.a.Function();
  });

  it('load should be defined', () => {
    should(index.offline.load).be.ok();
    should(index.offline.load).be.a.Function();
  });

  it('invalidations should be defined', () => {
    should(index.invalidations.init).be.ok();
    should(index.invalidations.init).be.a.Function();
    should(index.invalidations.compute).be.ok();
    should(index.invalidations.compute).be.a.Function();
    should(index.invalidations.on).be.ok();
    should(index.invalidations.on).be.a.Function();
    should(index.invalidations.getAndCompute).be.ok();
    should(index.invalidations.getAndCompute).be.a.Function();
    should(index.invalidations._invalidations).be.ok();
    should(index.invalidations._invalidations).be.an.Object();
  });

  it('websocket should be defined', () => {
    should(index.websocket).be.ok();
    should(index.websocket).be.an.Object();
    should(index.websocket.subscribe).be.a.Function();
    should(index.websocket.unsubscribe).be.a.Function();
    should(index.websocket.send).be.a.Function();
    should(index.websocket.stop).be.a.Function();
  });
});
