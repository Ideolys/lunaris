# Lunaris

## 1.24.1
*2021-12-09*
  - [Builder] Vue was not minified if option `isProduction = true`.

## 1.24.0
*2021-09-24*
  - [Builder] Add option to give a `.vue` file in `controllers` in `routes.json`.
  - [Builder] Add minMax to dayjs
  - Log error in http.request's catch.

## 1.23.0
*2021-08-26*
  - [Builder|Vue template compiler] Do not remove spaces at start and end of a tag.
  - `lunaris.http.setup` can set default http headers, see below:
    ```js
      lunaris.http.setup({
        headers : {
          'Accept-Language' : 'fr',
        }
      });
    ```
## 1.22.5
*2021-06-23*
  - Fix: Add merge for delete in `deleted` hook.

## 1.22.4
*2021-05-28*
  - Make flags dismissable.

## 1.22.3
*2021-05-28*
  - Fix duplciated callback when upsert failed (HTTP status <> 200 && json payload).


## 1.22.2
*2021-05-19*
  - Fix default class for error notification.

## 1.22.1
*2021-05-19*
  - Replace toasts of Buefy by d-sytem's flags.

## 1.22.0
*2021-05-18*
  - In `getRoutes` method, allow single quote in route's description.
  - Add option `mergeStrategy` for `lunaris.upsert`.

## 1.21.2
*2021-04-23*
 - `lunaris.delete`' result is merged with local value and returned in the callback.

## 1.21.1
*2021-04-06*
  - In validation functions, the object to validate is given to the function via `this.object`.
  - Add plugin `utc` to `dayjs`.

## 1.21.0
*2021-03-01*
  - Add `isPAginated` for store.
  - Replace `isPagination` by `isPaginated` for method `lunaris.get`.

## 1.20.6
*2021-02-17*
- Add option `isPagination` for method `lunaris.get`.
- Add plugin `isLeapYear` for `dayjs`.

## 1.20.5
*2021-02-11*
  - Fix IndexedDB initialization.

## 1.20.4
*2021-01-18*
  - Add dayjs' plugin `customFormat`.

## 1.20.3
**2020-11-06**
- Features:
  + Add support for json based errors for HTTP even if statusCode is different from 200.

## 1.20.2
**2020-08-21**
- Features:
  + Set dayjs version to 1.8.33.

## 1.20.1
**2020-08-03**
- Fixes:
  - `lunaris.http.request` was not correctly rejecting Promise.

## 1.20.0
**2020-07-20**
- Features:
  - Remove useless configuration parameter `isOfflineSync`.
- Fixes:
  - `lunaris.dynamicView`:
    + was not always defining the same instance for the internal data object.
    + `materialize()` was not returning the dynamic object for chaining purpose.
    + was not setting correctly the internal cache for ids. As a result, the view had duplicated values.
    + was not removing filtered values on update when using criterias.
    + was reseting the pipeline after reset event.
  - Store objects were not properly updated in `lunaris.get`.

## 1.19.0
**2020-06-29**
- Features:
  - Reduce compilation size.
  - Bump Vue to v2.6.11.
- Fixes:
  - Fix dayjs locale import.

## 1.18.1
**2020-06-16**
- Features:
  - Add a new attribute for store object, `isInvalidable`. It controls the ability of a store to be invalidated from the server. Default `true`.

## 1.18.0
*2020-05-29*
- Features:
  - Reduce the size of compilated stores.
- Fixes:
  - Lunaris crashed when using `lunaris.invalidate` with no parameters.
  - Builder did not correctly set some constructed functions.
  - Builder: javaScript dependencies could have been inserted multiple times.
  - Do not try to send data with a websocket not opened.
  - Remove invalidations handler before making invalidations request.

## 1.17.1
*2020-04-21*
- Fixes:
  - Fix `<>` operator for url generation.
  - Fix: when building components, errors were not catch.
  - Fix: builder did not set `urlsGraph` and `cacheGraph`.

## 1.17.0
*2020-03-27*
- Features:
  - Remove `lunaris.debug` features.
  - `lunaris.clear` accepts callback: `lunaris.clear(store, options, callback)` with `options = { isSilent : Boolean }`
  - Remove transactions, i.e. `lunaris.begin` and `lunaris.commit`.
  - Add a debounce function for `reset` hook when subscribing to stores in plugin.
  - Separate lunaris compilation from app compilation. `lunaris.js` and `lunaris.min.js` are available in `dist` directory.
- Fixes:
  - Dynamic views were not destroyed when unmounting an application. If not destroy, dynamic views are defined with no hooks because we remove all hooks when unmounting an app. As a result, the dynamic view does not longer follow store updates.
  - Set correct websocket protocol according to current HTTP protocol.

## 1.16.0
*2020-02-28*
- Features:
  - Add builder options `injectedCode`. Which is a string injected before `new Vue()` in application mounting point.
  - Add lunaris version in `lunaris.exports.version`.
  - [Builder] Lunaris is built once.
  - [Builder] Refacto error management.
  - [Builder] Make sync functions async.
  - `lunaris.get` accepts callback: `lunaris.get(store, PK, callback)`
  - `lunaris.delete` accepts callback: `lunaris.delete(store, value, callback)`
  - `lunaris.upsert|insert|update` accepts callback: `lunaris.upsert(store, value, callback)`
  - Add filter operator `<>`. It is equivalent to `!==` in JavaScript.
- Fixes:
  - builder options `lang` is optional.

## 1.15.1
*2020-01-31*
  - Features:
    - `lunaris.invalidate` & `cache.invalidate` supports `@` notation for store key.
    - Remove `lunaris.retry`.
    - Remove form features.
  - Fixes:
    - Fix builder options.
    - Fix urlsGraph generation by supporting filter.attributeUrl values.
    - Fix lightUrl invalidations by initializing invalidations from the server lightUrls.

## 1.15.0
*2020-01-06*
  - Add `lunaris.offline.isOfflineMode` attribute to set offline mode. In online the offline mode capture the invalidations and simulate offline connection.
  - Add `lunaris.offline.isSynchronizing` attribute. Internal use.
  - Add `lunaris._onInvalidate(event, handler)` to capture events in invalidation module. Only `invalidate` event is sent. It allows an handler to capture invalidations when offline mode is activated.
  - The offline app is not anymore mount when the the browser is online. The `lunaris._vue.mountOfflineApp` function must be used.
  - Add `lunaris.load(store)` function. It loads data of a store. The flag `lunaris.offline.isOfflineMode` must equal `true`.
  - Add event `insert` for store `lunarisOfflineTransaction` (i.e. where HTTP transactions are stored in offline/offline mode).
  - Add `lunaris.debug.isDebug` to activate or get debug mode value :
    + Log HTTP request
    + Log Cache request
    + Log in-collection indexedb performances
    + Log store events
    Debug logs are organized in different namespaces:
      - `performance`
      - `crud`
      - `http`
      - `hooks`
      - `cache`
      - `transaction`

    To activate or desactivate a namespace : `lunaris.debug.config.<namespace> = <true> / <false>`
  - BREAKING CHANGE : the reference feature does not copy object anymore. It ensures to propagate store primary keys. Notation:
  ```js
    // map storeA
    {
      id        : ['<<int>>'],
      label     : ['<string>'],
      objStoreB : ['object', {
        id    : ['int', 'ref', '@storeB'], // belongs to storeB
        label : ['string']                 // belongs to current store
      }]
    }
  ```
  - Add circular reference detection when compilating stores in builder.
  - Improve internal store collection performances (x15).
  - Lunaris do not try to compute anymore POST->DELETE and UPDATE->DELETE offline transactions.
  - Add lazy loading for stores. Use `isLazyLoad = true` in stores to activate it.
  - Change `lunaris.getOne` to use primary key: `lunaris.getOne(store, value, isPrimaryKey)`.
  - Add `lunaris.websocket.subscribe({String} channel, {Function} handler)`.
  - Add `lunaris.websocket.unsubscribe({String} channel)`.
  - Add `vm.socketChannels` to subscribe to websocket channels.
  - Add `filter.isSearchable`. If `false`, the filter value will be added to the url query options and not in the `search` value.
  - Every 10 minutes, the server invalidations are retrieved to compare local invalidations with server ones.
  - Add `store.isAutoRequest` atttribute to enable or disable automatic `lunaris.get` call on `reset` event when subscribing to store with `vm.stores`.
  - Add `lunaris.collectionResultSet` to query collection data (more in documentation).
  - Add `dependencies` option for `lunaris.build`.
  - La valeur `''` est accept??e pour les champs d??finis avec l'option `optional`.
  - Add `lunaris.dynamicView` (more in documentation).
- Fix:
  - Improve offline app.
  - In offline or offline mode, generated urls were not encoded.
  - When pushing offline transaction, the cache was not invalidate.
  - When pushing new object in offline transaction, the collection's index of ids was not correctly updated.
  - When pushing offline transaction, the plugin state was never updated.
  - The method `lunaris._removeAllHooks` was not correctly removing hooks.
  - The internal method `getPrimaryKeyValue()` was trying to cast primary keys as Number.
  - IndexedDB could block the application initialisation when opening a transaction of an inexistant store.
  - Localstorage was not able to save false value.

## 1.14.0
*2019-11-04*
- Features:
  - Add `lunaris.createUrl(store, method, primaryKey)` method to generate url for a store.
  - Update kitten-format to 1.6.3

## 1.13.0
*2019-09-30*
- Features:
  - Add `isOffline` attribute for module's routes. By default, `isOffline` value equals `false`.
  - Add `inherits` attribute in store object to inherit from a store its map.
  - Add event `success` to capture success notification which is a String.
  - Add event `clear` for `lunaris.clear` method.
  - Transactions include `lunaris.clear`.
  - Hooks are synchrone by default and asynchrone with a callback in second parameter : `lunaris.hook('event', function (data, done) {})`;
  - Add `isMapClone` attribute in store object to customize clone function by store. If true, a dedicated clone function is created for the store from the map. It is way more performant than `lunaris.utils.clone` or even `JSON.parse(JSON.stringify(data))`.

## 1.12.0
*2019-09-02*
- Features:
  - Add `errors` attribute in `lunaris.http` response when an error is detected. The store `lunarisErrors` has the server errors in `messageErrorServer` attribute which is an object as `{ error : Int | String, message : Sring, errors : Array }`.
- Fix:
  - Fix store setPagination method using wrong offset
  - `globals` were added twice in the build.
  - Remove `let`.

## 1.11.0
*2019-08-26*
- Features:
  - Add `lunaris._removeAllHooks` to remove all hooks.
  - Improve performances for `lunaris.utils.clone` method.
  - Rename `[Lunaris warn]` to `[Lunaris error]`.
- Fix:
  - Display primary key tip only for array stores.
  - Fix store compilation when using multi stores registration.
  - A store cannot reference itself.
  - Fix directive plugin on radio button.
  - Fix ILIKE filter in offline.
  - `lunaris.invalidate` must invalidate alias stores.
  - Fix array validation when using optional.
  - Fix blocking script during a request in production mode.

## 1.10.0
*2019-07-01*
- Features:
  - Add `isOffline` option to disable offline support for a filter.
  - Add `attributeUrl` option to customize filter name in the url.
  - Add filter validations:
    + `operator` fied is now required
    + a filter must filter an attribute of the map (except with `isOffline = false`)
    + only type string can use `ILIKE` filter
  - Add store references. Example, use `attribute : ['object', 'ref', '@storeToReference']`. The reference can be an `object` or an `array`.
  - Add IndexedDB
  - Add localStorage `lunaris.localStorage`
  - Add builder option `isOfflineStrategies`. When `isOfflineStrategies` is false, websockets and browser storage are disable.
  - Add cache invalidation strategies
  - Add offline strategies: cache, offline filters, primary key generation.
  - Add `lunaris.invalidate(@store)` to invalidate a store's cache
  - Add stores options `isErrornotification` and `isSuccessNotification`. If `false`, no toast will be displayed.
  - Add primay key offline generation.
  - Set error notification as a toast.
  - Add builder option `isOfflineSync` to activate or desactivate offline transactions synchronisation
  - Add offline synchronisation screen.
  - Desactivate notification when pushing offline transactions.
- Fix:
  - Fix cache in-memory values
  - Improve lunaris tip when no primary key has been defined.
  - Array attributes in store objet have an operator forced to ILIKE.
  - Application crashed when IndexedDB was downgraded.
  - Following transactions could not end.
  - Fix binarySearch for non integer values.

## 1.9.3
*2019-05-31*
- Features:
  - Add name and description for each route.
  - Upgrade buefy version from 0.7.2 to 0.7.6.
- Fix:
  - Simplify error message.

## 1.9.2
**
- Fix:
  - When making an HTTP GET, cache values were not used.
  - When making an HTTP GET, the `filterUpdated` were never fired.

## 1.9.1
**
- Fix:
  - When making an HTTP GET on a store filter, the transaction could never end.

## 1.9.0
*2019-04-01*
- Features:
  - Add syntax to clear multiple stores at the same time. Use `lunaris.clear('@myCommonStore*')`,
- Fix:
  - Fix store dependencies graph.

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
