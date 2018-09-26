# Lunaris

## 1.5.0
*2018-XX-XX*

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
