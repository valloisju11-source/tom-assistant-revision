// ============================================================
// App de consultation — navigation à 3 niveaux (matière → notion →
// document), lecture seule. Aucun chemin codé en dur : tout vient
// de index.json, généré par scripts/build-index.js.
//
// Routage : on utilise le hash de l'URL (#/...) pour que le bouton
// "retour" du navigateur (et le geste retour iOS) fonctionne, sans
// avoir besoin d'un serveur (site 100% statique).
// ============================================================

(function () {
  'use strict';

  var app = document.getElementById('app');
  var index = null; // contenu de index.json, chargé une fois au démarrage

  // --- Utilitaires ---------------------------------------------------

  function estRecent(dateIso, seuilJours) {
    var maintenant = Date.now();
    var date = new Date(dateIso).getTime();
    var joursEcoules = (maintenant - date) / (1000 * 60 * 60 * 24);
    return joursEcoules >= 0 && joursEcoules < seuilJours;
  }

  function formaterDate(dateIso) {
    try {
      return new Date(dateIso).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch (e) {
      return dateIso;
    }
  }

  // Une matière ou une notion "porte" une pastille si l'un de ses
  // documents (ou l'une de ses notions, pour une matière) a été
  // modifié récemment. C'est ce mécanisme qui fait "remonter" la
  // nouveauté du document jusqu'à l'accueil.
  function matiereRecente(matiere) {
    return matiere.notions.some(notionRecente);
  }
  function notionRecente(notion) {
    return notion.documents.some(function (d) {
      return estRecent(d.derniereMaj, index.seuilNouveauteJours || 7);
    });
  }

  function pastille() {
    var span = document.createElement('span');
    span.className = 'pastille';
    span.title = 'Mis à jour récemment';
    return span;
  }

  function creerCarte(titre, sousTitre, recent, onClick) {
    var bouton = document.createElement('button');
    bouton.className = 'carte';
    bouton.type = 'button';
    bouton.addEventListener('click', onClick);

    var contenu = document.createElement('span');
    contenu.className = 'contenu';

    var ligneTitre = document.createElement('span');
    ligneTitre.className = 'titre';
    ligneTitre.textContent = titre;
    if (recent) ligneTitre.appendChild(pastille());
    contenu.appendChild(ligneTitre);

    if (sousTitre) {
      var st = document.createElement('span');
      st.className = 'sous-titre';
      st.textContent = sousTitre;
      contenu.appendChild(st);
    }

    var chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '›';

    bouton.appendChild(contenu);
    bouton.appendChild(chevron);
    return bouton;
  }

  function topbar(titreCourant, hrefRetour) {
    var bar = document.createElement('div');
    bar.className = 'topbar';
    if (hrefRetour !== null) {
      var retour = document.createElement('button');
      retour.className = 'back-btn';
      retour.type = 'button';
      retour.innerHTML = '&larr; Retour';
      retour.addEventListener('click', function () {
        location.hash = hrefRetour;
      });
      bar.appendChild(retour);
    }
    var titre = document.createElement('span');
    titre.className = 'titre-courant';
    titre.textContent = titreCourant || '';
    bar.appendChild(titre);
    return bar;
  }

  function vider() {
    app.innerHTML = '';
  }

  // --- Niveau 1 : accueil (les matières) ------------------------------

  function afficherAccueil() {
    vider();
    app.appendChild(topbar('Révisions', null));

    var hero = document.createElement('div');
    hero.className = 'hero';
    hero.innerHTML = '<h1>Mes révisions</h1><p>Choisis une matière pour retrouver tes fiches, bilans et cartes mentales.</p>';
    app.appendChild(hero);

    var liste = document.createElement('ul');
    liste.className = 'liste-cartes';

    if (index.matieres.length === 0) {
      app.appendChild(elementEtatVide('Aucun contenu publié pour le moment. Reviens un peu plus tard !'));
      return;
    }

    index.matieres.forEach(function (matiere) {
      var li = document.createElement('li');
      var nb = matiere.notions.length;
      li.appendChild(creerCarte(
        matiere.label,
        nb + (nb > 1 ? ' thèmes' : ' thème'),
        matiereRecente(matiere),
        function () { location.hash = '#/' + matiere.id; }
      ));
      liste.appendChild(li);
    });
    app.appendChild(liste);
  }

  function elementEtatVide(texte) {
    var div = document.createElement('div');
    div.className = 'etat-vide';
    div.textContent = texte;
    return div;
  }

  // --- Niveau 2 : une matière (ses notions) ---------------------------

  function afficherMatiere(matiereId) {
    var matiere = index.matieres.find(function (m) { return m.id === matiereId; });
    vider();
    if (!matiere) {
      app.appendChild(topbar('Introuvable', '#/'));
      app.appendChild(elementEtatVide('Cette matière n\'existe pas (ou plus).'));
      return;
    }

    app.appendChild(topbar(matiere.label, '#/'));

    var hero = document.createElement('div');
    hero.className = 'hero';
    hero.innerHTML = '<h1>' + escapeHtml(matiere.label) + '</h1>' +
      '<p>' + matiere.notions.length + ' thème(s) disponible(s).</p>';
    app.appendChild(hero);

    var liste = document.createElement('ul');
    liste.className = 'liste-cartes';
    matiere.notions.forEach(function (notion) {
      var li = document.createElement('li');
      var sousTitre = notion.documents.map(function (d) { return d.label; }).join(' · ');
      li.appendChild(creerCarte(
        notion.titre,
        sousTitre,
        notionRecente(notion),
        function () { location.hash = '#/' + matiere.id + '/' + notion.id; }
      ));
      liste.appendChild(li);
    });
    app.appendChild(liste);
  }

  // --- Niveau 3 : une notion (ses documents) --------------------------

  function afficherNotion(matiereId, notionId) {
    var matiere = index.matieres.find(function (m) { return m.id === matiereId; });
    var notion = matiere && matiere.notions.find(function (n) { return n.id === notionId; });
    vider();
    if (!matiere || !notion) {
      app.appendChild(topbar('Introuvable', '#/'));
      app.appendChild(elementEtatVide('Ce thème n\'existe pas (ou plus).'));
      return;
    }

    app.appendChild(topbar(notion.titre, '#/' + matiere.id));

    var hero = document.createElement('div');
    hero.className = 'hero';
    hero.innerHTML = '<h1>' + escapeHtml(notion.titre) + '</h1>' +
      '<p>' + escapeHtml(matiere.label) + '</p>';
    app.appendChild(hero);

    var liste = document.createElement('ul');
    liste.className = 'liste-cartes';
    notion.documents.forEach(function (doc) {
      var li = document.createElement('li');
      var sousTitre = 'Mis à jour le ' + formaterDate(doc.derniereMaj);
      li.appendChild(creerCarte(
        doc.label,
        sousTitre,
        estRecent(doc.derniereMaj, index.seuilNouveauteJours || 7),
        function () { location.hash = '#/' + matiere.id + '/' + notion.id + '/' + doc.type; }
      ));
      liste.appendChild(li);
    });
    app.appendChild(liste);
  }

  // --- Niveau 4 : un document (rendu Markdown ou page HTML) -----------

  function afficherDocument(matiereId, notionId, docType) {
    var matiere = index.matieres.find(function (m) { return m.id === matiereId; });
    var notion = matiere && matiere.notions.find(function (n) { return n.id === notionId; });
    var doc = notion && notion.documents.find(function (d) { return d.type === docType; });
    vider();
    if (!matiere || !notion || !doc) {
      app.appendChild(topbar('Introuvable', '#/'));
      app.appendChild(elementEtatVide('Ce document n\'existe pas (ou plus).'));
      return;
    }

    var hrefRetour = '#/' + matiere.id + '/' + notion.id;
    app.appendChild(topbar(doc.label, hrefRetour));

    var entete = document.createElement('div');
    entete.className = 'doc-entete';
    var recent = estRecent(doc.derniereMaj, index.seuilNouveauteJours || 7);
    entete.innerHTML =
      '<span class="eyebrow">' + escapeHtml(matiere.label) + ' · ' + escapeHtml(notion.titre) + '</span>' +
      '<h1>' + escapeHtml(doc.titre || doc.label) + '</h1>' +
      '<p class="maj">Mis à jour le ' + formaterDate(doc.derniereMaj) +
      (recent ? ' <span class="pastille-texte">nouveau</span>' : '') + '</p>';
    app.appendChild(entete);

    if (doc.format === 'html') {
      var wrap = document.createElement('div');
      wrap.className = 'doc-iframe-wrap';
      var iframe = document.createElement('iframe');
      iframe.src = doc.path;
      iframe.title = doc.titre || doc.label;
      wrap.appendChild(iframe);
      app.appendChild(wrap);
      return;
    }

    // Document Markdown : on le récupère et on le convertit à l'affichage.
    var conteneur = document.createElement('div');
    conteneur.className = 'doc-rendu';
    conteneur.textContent = 'Chargement…';
    app.appendChild(conteneur);

    fetch(doc.path)
      .then(function (reponse) {
        if (!reponse.ok) throw new Error('HTTP ' + reponse.status);
        return reponse.text();
      })
      .then(function (markdown) {
        // Le titre de niveau 1 est déjà affiché dans l'en-tête de la page
        // (doc-entete) : on l'enlève du corps pour éviter de le voir deux fois.
        var sansTitre = markdown.replace(/^#\s+.+\n+/, '');
        conteneur.innerHTML = window.marked.parse(sansTitre);
        if (window.renderMathInElement) {
          window.renderMathInElement(conteneur, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
            ],
            throwOnError: false,
          });
        }
      })
      .catch(function (err) {
        conteneur.textContent = 'Impossible de charger ce document (' + err.message + ').';
      });
  }

  function escapeHtml(texte) {
    var div = document.createElement('div');
    div.textContent = texte;
    return div.innerHTML;
  }

  // --- Routage ---------------------------------------------------------

  function traiterRoute() {
    var hash = location.hash.replace(/^#\/?/, '');
    var segments = hash.split('/').filter(Boolean);
    if (segments.length === 0) return afficherAccueil();
    if (segments.length === 1) return afficherMatiere(segments[0]);
    if (segments.length === 2) return afficherNotion(segments[0], segments[1]);
    return afficherDocument(segments[0], segments[1], segments[2]);
  }

  function demarrer() {
    fetch('./index.json')
      .then(function (r) { return r.json(); })
      .then(function (donnees) {
        index = donnees;
        window.addEventListener('hashchange', traiterRoute);
        traiterRoute();
      })
      .catch(function (err) {
        vider();
        app.appendChild(elementEtatVide('Impossible de charger le catalogue de contenu (' + err.message + ').'));
      });
  }

  demarrer();
})();
