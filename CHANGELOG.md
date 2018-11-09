# Lunaris

## 1.6.0
*2018-XX-XX*
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
- Fix :


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
