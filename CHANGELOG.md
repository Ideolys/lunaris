# Lunaris

## 1.8.0
*2019-03-04*
- Features:
  - Do not compress the body of HTTP requests in development mode.
  - Validation function supports undefined values for optional attributes.
  - Add header `Content-Version` with value equals to `2`.
  - Allow multiple stores definition in one file. In module.exports, define an array of store objet instead of a store object `module.exports = [ {}, {}, ... ]`.
  - Begin/Commit supports lunaris.get/insert/update/upsert/delete with local store or/and default store. The transaction ensure that each action is sequential.
- Fix:
  - For GET HTTP request, if the cache value was an object, an empty array whould be returned.
  - Fix removeHook. When removing hooks, the function was looking at the same function definition and not the reference.

## 1.7.0
*2018-12-17*
- Features :
  - Add `vm.components` that references every vuejs components.
  - `vm.globlas` is availbale in all Vue components.
  - Cache is global to Lunaris instead of being specific to each store.
- Fix :
  - Local store were not considerated as valid store for lunaris.begin/lunaris.commit.
  - When using n times a store as filter source, n events `filterUpdated` were fired.
  - The int `0` was not a correct value for the function getPrimaryKeyValue. As a restult, store collections could have duplicate values.
  - The validation did not return the callback for a the store with no map.
  - The directive `v-lunaris` did not work with radio values.
  - The store collection did not delete index values.
  - An insert / update / delete in a store did not globally invalidate the cache.
  - Fix collection object duplication where object was inserted with a PK = null and then updated with PK != null.
  - Fix store's path error when displaying builder error.
  - Fix store FilterUpdated event. An empty local store cannot longer send the event.
  - Fix template compilation when imbricating rights.
  - When deleting a value from a store, the value could have been not deleted if the same value were inserted in the meantime.
  - Fix translations by enabling profiling.

## 1.6.1
*2018-11-19*
- Features :
- Fix :
  - Fix vue plugin store when setting store object value.
  - When making GET /:id, the value 0 was not considerated as a valid value.

## 1.6.0
*2018-11-16*
- Features :
  + Adding 2 new validation types: email and emailList
  + Add transformer functions.
  + Add constants object `lunaris.contants`. Constants are available in where filters, aggregates and computed properties.
  + Filters support local stores and offline mode. All filter features are available.
  + Store compilation errors are shown in browser console.
  + BREAKING CHANGES:
    + `lnuaris.clone` and `lunaris.freeze` are availbale through `lunaris.utils`
    + All aggregate type names have been changed to `<type>Agg` in order to prevent conflict with attributes types.
  + Add mass operations, use `lunaris.update@('@store:path.to.element', value)`. The mass opration will make a PATCH request to the server and conserve the operation for each new insert or update to the store.

## 1.5.0
*2018-10-22*
- Features :
  + A store can be joined with another store. Use `@storeToJoin` in the map. The stores must have a map.
  + Add support for aggregates :
      - MIN
      - MAX
      - COUNT
      - AVG

    Two types of aggregate are supported : external and internal. External aggregate depends on a joined store whereas internal aggregate does not.
  + Store reflexive relasionships are supported. Use `@storeName` in the map to reference the relation.
  + Add details in validation error messages when using `min` and/or `max`.
  + `v-lunaris` directive supports radio inputs.
  + Add a tip when fallback to _id when using function getPrimaryKey().
  + Improve debug information for lunaris-vue plugin.
- Fix :
  + Change vue component hook to remove hooks.
  + Empty arrays were not considarated as correct values in cache. As a consequence, HTTP requests were fired.
  + Add vue-color dependency https://github.com/xiaokaike/vue-color as color piker.
  + Fix all version from package.json.
  + Fix rights.
  + Fix PUT/POST callback wen upserting collection with one object by using COMMIT/BEGIN.
  + Fix builder crash when building stores.
  + Fix cache when comparing array values.
  + Stop to pollute global scope.
  + Optional filter values support specific characters like ' for HTTP requests.
  + Some collection values were not immutable and or not frozen.
  + GET action send `filterUpdated` event if the store is a filter for another store.
  + Hooks defined via the object `storeHooks` were not removed when component was.

## 1.4.1
*2018-09-26*
- Fix : replace ES6 variables definition by var.

## 1.4.0
*2018-09-24*

- Features :
  + Add transaction for local stores. Add functions `lunaris.begin()` and `lunaris.commit()`. The transaction system is designed to guarantee that the insert/update/upsert on local stores will perform one and only one event to update the dependent store(s).
  + Add PAKO to compress HTTP requests with gzip
  + Expose http module. New method available : `lunaris.http.request`.
  + Add attribute sourceWhere for filters in order to filter the filter's data.
  + Add index of map id in each collection. It allows to not duplicate values which have the same map id. If duplication, the duplicate value is merged with the previous one.
  + Directive v-lunaris supports ckeckbox input.
  + Translate validation error messages.
  + lunaris.validate returns all the errors, not only the first one.
  + Add `$methodFemale` for store templates.
- Fix:
  + The redirection could fail.
  + Add parameter isUnique for `lunaris.hook(hook, handkler, isUnique)`. If true, the function will register unique handlers.
  + Fix data duplication in vue plugin if a store was registered in multiple components at the same time.
  + Enable dayjs format plugin
  + Fix translations. In HTML files, the `'` was translated to `\'`.
  + Fix default values. Sub object is now null.
  + Fix merge values POST / PUT.

## 1.3.0
- Features:
  - Breaking changes! Filter values are based on store types:
    + filters which have an array store source can only generate array based values.
    + filters which have a store object source can generate all types of filters: =, ILIKE, >, >, >=, <=.

    The default filter operator is 'ILIKE'.

## 1.2.2

- Fix :
  + When we rolled back a GET action, an error was thrown because of no given data. However, a failed GET action do not have such data. The rollback method do not longer expect data for GET actions.
  + Add a Promise polyfill for IE
  + Fix an infinite HTTP redirection loop for IE
- Features :
  + Adding lanugage support for dayjs
