# Builder

## Get started

1. Require lunaris

```js
const lunaris = require('lunaris');
```

2. Build the app

```js
const lunaris = require('lunaris');

lunaris.build({
  modulesFolder               : null,  // where are modules ?
  vuejsGlobalComponentsFolder : null,  // where are vuejs global components ?
  profile                     : {},    // profile object
  isProduction                : false, // is prodution build ?
  langPath                    : null,  // where are lang files ?
  lang                        : null,  // fr, es, nl, ...
  isLangGeneration            : false, // is builder required to generate lang file
  startLink                   : '/'    // from where to launch the app
}, (err, code) => {
  // do some magic
});
```

## Features

 - Vuejs template compilation
 - Transpiling
 - ES6 modules
