# tom-assistant-revision

Dépôt **public** de diffusion pour l'"Assistant scolaire Tom" : uniquement le
contenu de révision **validé** (fiches, bilans, cartes mentales) prêt à être
lu depuis l'iPhone de Tom, plus le code de la web app de consultation
(lecture seule). Hébergé via GitHub Pages.

## Deux dépôts, deux rôles

- **Atelier** (privé, `Assistant-scolaire-TOM`) : programmes officiels,
  découpage en fiches, scans de cours, contenu en cours de vérification.
- **Vitrine** (ce dépôt, public) : uniquement ce qui a été explicitement
  validé pour diffusion publique, plus le code de la web app.

## ⚠️ Contrainte de confidentialité — non négociable

Ce dépôt est **public**, donc lisible par n'importe qui sur Internet, sans
authentification.

**Jamais** de nom de famille, de scan de cahier, de photo, ou de tout autre
élément identifiant Tom dans ce dépôt. Seul du contenu explicitement validé
pour diffusion publique doit y être ajouté.

## Structure

```
/
├── index.html          page unique de l'app (shell)
├── app.js              navigation + rendu des documents
├── style.css           mise en forme (mêmes tokens que les fiches HTML)
├── manifest.json        pour l'ajout à l'écran d'accueil iOS
├── vendor/              marked + KaTeX, livrés avec le site (pas de CDN)
├── scripts/
│   └── build-index.js  régénère index.json à partir du contenu présent
├── index.json           généré, ne pas éditer à la main
├── mathematiques/
├── physique-chimie/
└── svt/                 contenu validé, un fichier par notion :
                          <notion>.md + <notion>-bilan.md (avant conversion)
                          ou <notion>.html (fiche + bilan combinés, format final)
```

## Publier du contenu

1. Copier depuis le dépôt privé les fichiers déjà validés, dans le dossier
   de la bonne matière (mêmes noms de fichiers, aucune transformation).
2. Régénérer l'index : `node scripts/build-index.js`
3. Commit + push. L'app lit `index.json` au démarrage, aucun chemin n'est
   codé en dur : un thème qui n'a que sa fiche (pas encore de bilan ni de
   carte mentale) s'affiche quand même normalement.

## App de consultation

Navigation à 3 niveaux (matière → thème → document), en JS simple sans
framework, hash-routée (`#/svt/mitose/page`) pour que le bouton retour du
navigateur fonctionne. Le Markdown est converti à l'affichage (marked) et
les formules mathématiques rendues avec KaTeX ; les fiches déjà converties
en HTML (fiche + bilan combinés) s'affichent telles quelles dans le cadre de
navigation. Un document modifié depuis moins de 7 jours porte une pastille,
qui remonte jusqu'au niveau du thème et de la matière.

## État actuel

App fonctionnelle et testée localement (navigation, rendu Markdown+KaTeX,
affichage des pages HTML). **Aucun contenu n'est encore publié** : le seul
document validé à ce jour côté atelier
(`svt/division-cellulaire-mitose-meiose.html`) n'a pas encore été copié ici,
en attente d'une action de copie entre les deux dépôts.
