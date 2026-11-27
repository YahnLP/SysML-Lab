# SysML-Lab

Application web autonome (un seul fichier HTML, hors ligne) pour apprendre à **lire, expliquer et compléter** des diagrammes SysML en agissant, sur le cas fictif NovaTech.

Trois parcours indépendants, chacun avec son carnet :

| Parcours | Modules | Niveaux visés |
|---|---|---|
| Bac pro CIEL | C0 à C5 | 1 et 2 |
| TSSR (titre pro) | T0 à T8 | 1 à 3 (3 ponctuel) |
| BTS SIO SISR | B0 à B9 | 1 à 3 (4 facultatif) |

Niveaux : 1 Information, 2 Expression, 3 Maîtrise d'outils, 4 Maîtrise méthodologique.

## Tester

Ouvrir `index.html` (à la racine) dans un navigateur, ou activer GitHub Pages (Settings, Pages, branche `main`, dossier `/ (root)`).

## Développer

```
npm install
npm run dev        # serveur local
npm test           # vérificateurs, rendu, intégrité du contenu
npm run build      # typecheck + build + copie vers ./index.html
```

## Structure

- `src/render` : rendu SVG générique (REQ, BDD, IBD, UC, ACT, STM, PKG, réseau) et séquence
- `src/activities` : vérificateurs purs (`checks.ts`) et interface (`ui.ts`) des 8 types d'activités
- `src/content` : données des parcours (modules, cours, activités), cas NovaTech partagé
- `src/state.ts`, `src/report.ts`, `src/views.ts` : progression, rapports, vues

## Fonctionnement pédagogique

Chaque faute est expliquée par la règle de notation ou la logique du système enfreinte. Indices à trois niveaux en entraînement ; évaluation finale à tentative unique, sans indice, avec variante selon le nom et correction à la fin. Progression stockée localement (aucun serveur). Rapport exportable (JSON avec empreinte, HTML imprimable) et vue enseignant par import de plusieurs rapports.

## Statut

Niveaux par formation, barèmes sur 20, seuils du carnet et cas NovaTech sont des choix pédagogiques, pas des prescriptions des référentiels. SysML ne remplace pas les schémas réseau. Licence : EUPL-1.2.
