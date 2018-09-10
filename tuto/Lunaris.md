# Lunaris

Qu'est ce que Lunaris ? Dans un premier temps, on pourrait retenir que Lunaris signifie lunaire en latin. Mais, on notera surtout que lunaris est avant tout un écosystème pensé entre la couche client et la couche serveur.

Au sein d'Ideos, un conteneur de données est une API exposant des données modélisées dans une base. Ces données sont exposées au moyen d'une map décrivant leurs structures : types, valeurs par défaut, fonctions de transformations, etc.
Lunaris n'est qu'une interface vers ces conteneurs. C'est pourquoi Lunaris possède exclusivement des conteneurs de données, c'est à dire, des stores.

Lunaris est store. Lunaris n'est que store.

De ce postulat découle l'entière philosophie de Lunaris. Avant d'effectuer une requête vers le serveur, Lunaris effectue les opérations localement. Par conséquent, Lunaris supporte (architecturalement parlant) de facto le mode offline. 
On pourrait comparer Lunaris à un SGBD où chaque store serait une table avec ses relations, ses contraintes, ses champs, etc. Ainsi, Lunaris est le garant de l'état de chaque store. C'est pourquoi il n'existe pas de callback pour le CRUD par exemple.

En définitive Lunaris ne possède qu'un but, permettre de développer des fonctionnalités innovantes simplement, pour peut-être, toucher les étoiles.

## Suite

[Tu va désormais pouvoir commencer à rentrer dans le monde fabuleux de la V2](part1.md)