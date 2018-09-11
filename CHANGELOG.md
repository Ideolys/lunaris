# Lunaris

## 1.4.0
- Features :
  + Add transaction for local stores. Add functions `lunaris.begin()` and `lunaris.commit()`. The transaction system is designed to guarantee that the insert/update/upsert on local stores will perform one and only one event to update the dependent store(s).
  + Add PAKO to compress HTTP requests with gzip
  + Expose http module. New method available : `lunaris.http.request`.

- Fix:
  + The redirection could fail.

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
