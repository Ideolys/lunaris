# Projet Lunaris

« Il faut toujours viser la lune, car même en cas d’échec, on atterrit dans les étoiles »
-- Oscar WILDE

Lunaris est la traduction de lunaire en latin. 


# Humour Question / Réponses

- "Etre dans la lune" ne peut plus être un défaut. Cela démontre une vraie volonté d'améliorer la productivité de l'entrerpise !
- On sera bien luné grâce à Lunaris
- Nos clients vont tous tomber de la lune en voyant le résultat
- Enfin, on y verra clair de lune dans le code
- Nous avons qu'une lune de miel (1 mois)  pour concrétiser ce projet
- Il va falloir décrocher la lune car le projet parait impossible
- Faudra pas non plus demander la lune, aucune solution n'est parfaite
- La lune, ça parait loin, et pourtant c'est tout proche

# Recherches

- [Comparatif : Vuejs, React, Angular](https://docs.zoho.com/file/5j7aqe18432a5e6a9410da9968cd88667ef92)
- [Réponses questionnaires](https://docs.zoho.com/file/5mzbl8e23756df50b499cbf4fcc73f968988b)

# Comment communiquer entre le serveur (model) et les objet vueUS

Si on a notre propre système de base de données coté client, comment pousser les data à VueJS :
 - via les props : binding model -> vue à priori possible. Quid du binding vue -> model ? 
 - via un require + une fonction dans data {} : binding model -> vue à priori possible. Quid du binding vue -> model ? 
 - via un plugin (un peu comme VueX this.$store.state.todos...) et les computed : le binding model -> vue  serait à priori ok. VueJS résoud les dépendances et ne recalcul 
   pas si la dépendance n'a pas changé. Par contre, comment VueJS est au courant d'une mise à jour ? Par contre le binding vue -> model doit être fait la main.


Utiliser Vuex : 
 - malgré tout : beaucoup de chose fait main (validation formulaire, aggrégat). Le model doit être définit 2 fois (dans data et dans le store VueX). Car toute modif dans le store VueX doit être fait 
   par une fonction de mutation, du coup vue ne peut pas mettre à jour directement le store.

Validation des dormulaire (comment retourner l'erreur en live ) :
 - dans vue par défaut, il faut faire à la main
 - https://monterail.github.io/vuelidate/#getting-started Vuelidate appporte un peu de souplesse mais il faut définir les phrase d'erreur dans l'HTML
 - http://vee-validate.logaretm.com/ est un peu mieux mais les règle des validation (required, ...) sont directement dans l'HTML


# Lecture conseillée

Toute l'équipe, en avant  !

![alt text](images/lecture.jpg)