const index = require('../src/index');
const utils = require('../src/utils');

describe('lunaris index', () => {
  it('_stores should be defined', () => {
    should(index._stores).be.ok();
    should(index._stores).be.an.Object().and.eql(require('../src/exports.js')._stores);
  });

  it('clone() should be defined', () => {
    should(index.clone).be.ok();
    should(index.clone).be.a.Function();
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

  it('retry() should be defined', () => {
    should(index.retry).be.ok();
    should(index.retry).be.a.Function();
  });

  it('getDefaultValue() should be defined', () => {
    should(index.getDefaultValue).be.ok();
    should(index.retry).be.a.Function();
  });

  it('freeze() should be defined', () => {
    should(index.freeze).be.ok();
    should(index.freeze).be.a.Function();
  });

  it('_resetVersionNumber() should be defined', () => {
    should(index._resetVersionNumber).be.ok();
    should(index._resetVersionNumber).be.a.Function();
  });
});
