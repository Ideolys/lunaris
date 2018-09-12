# Votre premier store.

Dans la V2 tout est store, c'est l'élément majeur de cette version.
Voyez un store comme une base de donnée, ça stocke des valeurs et en plus c'est capable de pleins de choses.

## Où se trouvent les stores

On peut retrouver les stores dans **client-v2/stores**

## Créons notre premier store

### Création de l'architecture du store

Nous allons simplement nous placer dans **client-v2/stores** et de créer un dossier qui portera le nom de votre store (Dans notre cas **tuto_scales**).

Dans ce dossier nous créerons différents fichiers de store.

Vous pouvez d'ailleurs créer votre premier fichier de store qui se nommera en l’occurrence **tutoScales.js**

### Quelques infos importante sur les stores

Tout d'abord, un store peut-être **local** tous comme connecté à une **API** ideos.
Aussi un store peut contenir différents **filtres** qui lui permettront de filtrer les données.
Les stores peuvent aussi permettre de **valider** les données.

### Allons créer ce store

Tous d'abord, il va falloir utiliser `module.exports` afin que lunaris puisse charger ce store correctement.

Nous allons aussi dès à présent donner un nom et une url à notre store.
*Chose importante dans lunaris le store ne peut prendre qu'une seule URL, on utilisera donc uniquement des URL au pluriel.*

*Fichier:* **tutoScales.js**
```js
module.exports = {
  name : 'tutoScales',
  url  : 'scales'
};
```

Pour ce store nous aurons aussi besoin d'un premier filtre.

Un filtre est un élément du store qui permet de filtrer les données et ajouter des éléments à l'URL si elle existe. Nous en découvrirons différents types au cours de ce tutoriel.

```js
module.exports = {
  ...
  filters : [ {
    source          : '@currentSite',
    sourceAttribute : 'id',
    localAttribute  : 'site',
    isRequired      : true,
    httpMethods     : ['GET']
  }]
};
```

*Ce store lors d'une méthode GET appelleras l'URL* ***/stores/site/:id***
*Le store* ***currentSite*** *est un store global à la V2 toujours remplis avec les infos du site courant*

**Commençons par décortiquer ce filtre**

* **source:** C'est le nom du store source, chaque filtre auras besoin d'un store source.
* **sourceAttribute:** Le store source contiens des valeurs liées à des clés (attributs). C'est la clé de la valeur que l'on cherche
* **localAttribute:** attribut du store actuel, dans ce cas là c'est ce qui va être ajouté à l'url
* **isRequired:** Est-ce que ce filtre est requis ?
* **httpMethods:** méthodes HTTP pour lesquelles le filtre sera actif.

## Inclure le store dans notre module

### Dans le controller:

Il va tout d'abord falloir déclarer que nous allons charger ce store dans ce controller

*Fichier:* **index.js**
```js
module.exports = {
  ...
  stores : ['tutoScales']
  ...
};
```

Désormais on va aller appeler le store lors de la création de la page:

*Fichier:* **index.js** 
```js
module.exports = {
  ...
  created : function () {
    lunaris.get('@tutoScales');
  }  
  ...
};
```
Dans lunaris pas de callback, donc les données seront stockées dans une variable `$tutoScales` une fois qu'elles auront été récupérés.

### Dans la vue

Il suffit simplement d'utiliser la variable `$tutoScales`

*Fichier:* **index.html**
```html
...
<p v-for="scale in $tutoScales">
	{{ scale.label }}
</p>
...
```