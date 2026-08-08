# Tony Tonic 🏋️

Application personnelle de suivi **fitness, nutrition et santé**. PWA mobile-first,
**100 % locale** : toutes les données vivent dans IndexedDB sur ton appareil — aucun compte,
aucun serveur, aucun cloud. Seule exception : les fonctions IA appellent l'API Anthropic
(optionnelles, jamais un prérequis).

## App en ligne

➡️ **https://francoispouhyet-dot.github.io/Tony-Tonic/** (déployée automatiquement par
GitHub Actions sur la branche `gh-pages` à chaque push). Les données restent locales à
chaque appareil/navigateur : le site n'est qu'un livreur de fichiers statiques.

## Lancer l'app

```bash
npm install
npm run dev        # serveur local, accessible sur le réseau (--host)
```

Le terminal affiche une URL du type `http://192.168.x.x:5173` → ouvre-la sur ton téléphone
(même réseau Wi-Fi). Pour la version optimisée : `npm run build && npm run preview`.

## Installer sur l'écran d'accueil (iPhone)

1. Ouvre l'app dans **Safari**.
2. Bouton **Partager** → **« Sur l'écran d'accueil »**.
3. L'app s'ouvre en plein écran et fonctionne **hors ligne** (service worker).

⚠️ iOS peut purger les données des sites peu visités. L'app demande la persistance du
stockage, mais la vraie protection c'est la **sauvegarde régulière** (rappel automatique
après 7 jours sans export).

## Sauvegarder / restaurer

- **Réglages → Exporter** : télécharge un JSON complet (photos d'exercices incluses).
  La clé API n'est **pas** incluse dans l'export.
- **Réglages → Importer** : restaure une sauvegarde (remplace tout).
- Un bandeau discret te rappelle d'exporter si la dernière sauvegarde date de plus de 7 jours.

## Fonctions IA (optionnelles)

Dans **Réglages**, colle ta clé API Anthropic (stockée uniquement en local sur l'appareil).
Sans clé, toutes les fonctions IA sont grisées avec explication — le reste de l'app
fonctionne intégralement. Modèles configurables : Haiku (analyses de séance, tickets de
caisse) et Sonnet (bilans hebdomadaires, analyses croisées). Chaque appel n'envoie que les
données strictement nécessaires à l'analyse demandée.

## Données de démo

**Réglages → Charger la démo** remplit l'app d'exemples (séances, poids, repas, santé) pour
valider les écrans. **Réglages → Tout effacer** nettoie tout avant tes vraies données
(les aliments CIQUAL et tes réglages sont conservés).

## Notes techniques

- **Stack** : React + Vite + TypeScript + Tailwind, Dexie.js (IndexedDB), Recharts,
  vite-plugin-pwa. Justification : Dexie est la surcouche IndexedDB la plus robuste
  (transactions, index composés, hooks React) ; appels IA en `fetch` direct avec l'en-tête
  CORS officiel `anthropic-dangerous-direct-browser-access` (zéro dépendance SDK).
- **Aliments** : sous-ensemble local de la table **CIQUAL** (ANSES, licence ouverte),
  valeurs /100 g modifiables, prix au kg ou à l'unité.
- **Import Apple Santé** : Santé → « Exporter toutes les données » sur iPhone → dézipper →
  sélectionner `export.xml` dans l'app (Santé → Import). Lecture en flux (fichiers volumineux
  OK), déduplication par meilleure source/jour, saisies manuelles conservées.
- **Conventions stats** : e1RM = formule d'Epley ; « série dure » = RIR ≤ 2 ou non renseigné ;
  le tonnage d'une série compte pour chaque groupe musculaire de l'exercice ; courbe de poids
  lissée par moyenne mobile 7 jours.

⚕️ Tony Tonic ne fournit aucun avis médical. Douleur aiguë, persistante ou inquiétante →
consulte un professionnel de santé.
