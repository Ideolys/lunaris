# I - Votre premier module.

Dans la V2 chaque écran dépendras d'un module, nous allons voir cela.

## Architecture de la V2

Tout d'abord, il y a deux dossiers importants:
* client-v2
* public-v2

#### client-v2

Contiens:
* Un dossier "global-components" *Les* ***composants globaux***, *vous pouvez vous en servir partout*
* Un dossier "lang" *Pour les différentes* ***traductions***
* Un dossier "modules" *Les modules contiennent les* ***vues*** *et les* ***controllers***
* Un dossier "stores" *Pour les stores, ce sont les* ***sources de données***

#### public-v2

Contiens: 
* Un dossier "css" *Pour le* ***css*** *compilé*
* Un dossier "fonts" *Pour les* ***polices d'écritures***
* Un dossier "images" *Pour les* ***images***
* Un dossier "scss" *Pour le* ***scss*** *(Un préprocesseur css)*
 
## Créons notre premier module.

### Création de l'architecture du module.

Nous allons commencer par se placer dans le dossier *client-v2/modules*. Ensuite, nous allons créer un dossier qui portera le nom de notre module (En l'occurence **tuto_scales**)

Ensuite, il faudra créer trois fichiers:

* index.html
* index.js
* routes.json

### Ajoutons notre première route

*Fichier:* **routes.json**
```json
{
  "/tuto_scales" : {
    "controllers" : "index",
    "name" : "${Tuto scale}",
    "description" : "${Tuto scale}",
    "group" : [ "wastes", 0]
  }
}
```
Analysons ce fichier: 


* `"/tuto_scales" : {`
  C'est la route par laquelle on pourra accéder à notre écran. 
* `"controller" : "index",` 
  Nom du fichier du controller (Sans *.js*)
* `"name" : "${Tuto scale}"`
  Nom du module
* `"description" : "${Tuto scale}",`
  Description du module
* `"group" : [ "wastes", 0]`
  Onglet dans lequel notre module se trouvera

*Il faudra bien pensée à faire un ./easilys presync et un ./easilys sync*

### Afficher une page: 

**Désormais il va falloir afficher une page:**

> Lunaris utilise `module.exports` et `exports` pour exporter des modules et ressources (à la manière de Nodejs), et `require` pour les imports.

> Par défaut, un module easilys doit toujours être exporté via `module.exports`.
> Voyez cet objet comme un objet Vue.js

```js
module.exports = {
...
};
```

Pour commencer il va falloir donner un nom à notre controller
Ainsi qu'un template (La vue liée à notre controller)

*Fichier:* **index.js** 
```js
module.exports = {
  name     : 'tuto_scales', // Nom du controller
  template : 'index.html'   // Nom du template (Fichier de vue créer plus tôt)
};
```

**Maintenant on va aller ajouter du code à notre vue:**

> Dans la V2 toutes nos vues sont rendues entre les balises layout

```html
<layout ref="ref">
...
</layout>
```

Nous allons donc créer notre vue entre ces balises
```html
<layout ref="scales-ref">
  <div  slot="middle-panel-header-title">
    ${Scales (tuto)}
  </div>
</layout>
```

Plusieurs choses:
* "ref" c'est quoi ?
  Ça permet ensuite depuis le controller d’accéder à différentes actions sur notre vue.
* Et le "slot" il sert à quoi ?
  C'est un des éléments du layout ils se trouvent tous dans **client-v2/global-components/layout/layout.vue**
* "${}" ça fait quoi ?
  C'est le système de traduction universel à tous easilys, tout ce qui se trouve dans cet élément seras traduit.


Désormais on va pouvoir ajouter du contenu sur notre écran:

```html
...
<div  slot="middle-panel-body-content">
  <p>Ici se trouve le contenu de ma page</p>
</div>
...
```
## Suite

[Tu vas désormais pouvoir rentrer dans un fabuleux magasin !](part3.md)