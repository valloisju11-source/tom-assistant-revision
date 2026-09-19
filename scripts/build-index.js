#!/usr/bin/env node
// Génère index.json à partir du contenu réellement présent dans les dossiers
// mathematiques/, physique-chimie/, svt/ à la racine de ce dépôt.
// Aucune dépendance externe : Node standard + `git log` pour dater les fichiers.
//
// Usage : node scripts/build-index.js
// À relancer à chaque publication de contenu (voir README).

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');

// Une matière = un dossier à la racine du dépôt, avec son libellé d'affichage.
const MATIERES = [
  { id: 'mathematiques', label: 'Mathématiques' },
  { id: 'physique-chimie', label: 'Physique-Chimie' },
  { id: 'svt', label: 'SVT' },
];

// Fichiers qui ne sont pas des documents de notion (à ignorer si présents).
const FICHIERS_IGNORES = new Set(['programme-officiel.md']);

// Nombre de jours en dessous duquel un document est considéré "nouveau".
const SEUIL_NOUVEAUTE_JOURS = 7;

// Date de dernière modification d'un fichier suivi par git ; à défaut
// (fichier non versionné, git indisponible), on retombe sur le système de fichiers.
function dateDerniereModif(cheminAbsolu, cheminRelatif) {
  try {
    const sortie = execFileSync(
      'git', ['log', '-1', '--format=%aI', '--', cheminRelatif],
      { cwd: RACINE, encoding: 'utf8' }
    ).trim();
    if (sortie) return sortie;
  } catch (e) {
    // git indisponible ou fichier non suivi : on utilise le fallback ci-dessous.
  }
  return fs.statSync(cheminAbsolu).mtime.toISOString();
}

// Extrait un titre lisible d'un fichier Markdown (premier titre de niveau 1)
// ou d'un fichier HTML (balise <title>).
function extraireTitre(cheminAbsolu, format) {
  const contenu = fs.readFileSync(cheminAbsolu, 'utf8');
  if (format === 'html') {
    const m = contenu.match(/<title>([^<]*)<\/title>/i);
    if (m) return m[1].trim();
  } else {
    const m = contenu.match(/^#\s+(.+)$/m);
    if (m) return m[1].trim();
  }
  return path.basename(cheminAbsolu, path.extname(cheminAbsolu))
    .replace(/-bilan$/, '')
    .replace(/-/g, ' ');
}

// Transforme un identifiant de notion ("second-degre") en libellé lisible,
// utilisé seulement si aucun titre n'a pu être lu dans les fichiers.
function libelleDepuisId(id) {
  const mot = id.replace(/-/g, ' ');
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}

function construireNotion(dossierMatiere, matiereId, notionId, fichiersDuDossier) {
  const documents = [];

  function ajouterSiPresent(nomFichier, type, label, format) {
    if (!fichiersDuDossier.has(nomFichier)) return null;
    const cheminAbsolu = path.join(dossierMatiere, nomFichier);
    const cheminRelatif = path.join(matiereId, nomFichier);
    const doc = {
      type,
      label,
      path: cheminRelatif.split(path.sep).join('/'),
      format,
      titre: extraireTitre(cheminAbsolu, format),
      derniereMaj: dateDerniereModif(cheminAbsolu, cheminRelatif),
    };
    documents.push(doc);
    return doc;
  }

  // Une notion convertie en HTML combine fiche + bilan dans un seul fichier :
  // on l'affiche telle quelle, sans dupliquer avec les sources .md.
  const page = ajouterSiPresent(`${notionId}.html`, 'page', 'Fiche + bilan', 'html');
  if (!page) {
    ajouterSiPresent(`${notionId}.md`, 'fiche', 'Fiche de révision', 'markdown');
    ajouterSiPresent(`${notionId}-bilan.md`, 'bilan', 'Bilan de connaissances', 'markdown');
  }
  // Carte mentale : optionnelle, affichée seulement si le fichier existe déjà.
  const carte = ajouterSiPresent(`${notionId}-carte-mentale.html`, 'carte-mentale', 'Carte mentale', 'html');
  if (!carte) ajouterSiPresent(`${notionId}-carte-mentale.md`, 'carte-mentale', 'Carte mentale', 'markdown');

  if (documents.length === 0) return null;

  const titre = (page && page.titre)
    || (documents.find((d) => d.type === 'fiche') || {}).titre
    || libelleDepuisId(notionId);

  const derniereMaj = documents.reduce(
    (max, d) => (d.derniereMaj > max ? d.derniereMaj : max),
    documents[0].derniereMaj
  );

  return { id: notionId, titre, documents, derniereMaj };
}

function construireMatiere(matiere) {
  const dossier = path.join(RACINE, matiere.id);
  if (!fs.existsSync(dossier)) return null;

  const fichiers = fs.readdirSync(dossier)
    .filter((f) => !FICHIERS_IGNORES.has(f))
    .filter((f) => f.endsWith('.md') || f.endsWith('.html'));
  const ensembleFichiers = new Set(fichiers);

  // Un identifiant de notion = nom de fichier sans suffixe -bilan/-carte-mentale ni extension.
  const idsNotions = new Set();
  fichiers.forEach((f) => {
    const base = f.replace(/\.(md|html)$/, '');
    const id = base.replace(/-bilan$/, '').replace(/-carte-mentale$/, '');
    idsNotions.add(id);
  });

  const notions = Array.from(idsNotions)
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .map((id) => construireNotion(dossier, matiere.id, id, ensembleFichiers))
    .filter(Boolean);

  if (notions.length === 0) return null;

  const derniereMaj = notions.reduce(
    (max, n) => (n.derniereMaj > max ? n.derniereMaj : max),
    notions[0].derniereMaj
  );

  return { id: matiere.id, label: matiere.label, notions, derniereMaj };
}

function main() {
  const matieres = MATIERES.map(construireMatiere).filter(Boolean);
  const index = {
    genereLe: new Date().toISOString(),
    seuilNouveauteJours: SEUIL_NOUVEAUTE_JOURS,
    matieres,
  };
  const cheminSortie = path.join(RACINE, 'index.json');
  fs.writeFileSync(cheminSortie, JSON.stringify(index, null, 2) + '\n', 'utf8');
  console.log(`index.json généré : ${matieres.length} matière(s), ` +
    `${matieres.reduce((n, m) => n + m.notions.length, 0)} notion(s) au total.`);
}

main();
