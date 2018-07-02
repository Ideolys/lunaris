const index = require('../src/index');

describe('lunaris index', () => {
  it('_stores should be defined', () => {
    should(index._stores).be.ok();
    should(index._stores).be.an.Object().eql({});
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
});
