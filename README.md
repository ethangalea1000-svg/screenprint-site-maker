# Langue

Parcours d'anglais en français : 98 leçons réparties en 25 unités, avec QCM,
phrases à remettre en ordre, écoute, écriture et exercices oraux selon les
capacités du navigateur.

**Application autonome :** https://ethangalea1000-svg.github.io/screenprint-site-maker/

L'ancien lien Lovable peut demander une connexion. Le site GitHub Pages est
accessible sans compte Lovable.

## Progression et données

- Un test d'unité réussi à au moins 80 % valide ses leçons.
- Refaire un test d'une unité déjà validée ne donne pas d'XP supplémentaire.
- La progression est enregistrée dans le stockage local du navigateur, sur cet
  appareil et cette origine. Il n'y a pas de synchronisation de compte.
- Effacer les données du site peut effacer cette progression.

## Audio et micro

La lecture et la reconnaissance vocales utilisent les fonctions du navigateur.
Le micro demande une autorisation. En cas d'erreur, une réponse écrite permet de
continuer. Certains navigateurs envoient l'audio à leur propre service de
reconnaissance ; Langue n'enregistre pas la voix.

Les tests automatisés du cycle du micro utilisent un simulateur. Ils ne prouvent
ni la précision de la reconnaissance réelle ni la qualité du son sur un appareil.
Les mentions A1 à C2 décrivent le classement du contenu, pas une certification.

## Développement

Les workflows utilisent Node.js 24.

```sh
npm install --no-audit --no-fund --legacy-peer-deps
npm test
npx tsc --noEmit
npx vite build --config vite.pages.config.ts
npx vite preview --config vite.pages.config.ts
```

La construction Pages autonome produit `.output/public`. Le workflow
`.github/workflows/deploy-pages.yml` publie cette version. Le script `npm run
build` utilise une autre configuration, avec TanStack Start/Nitro.

Projet initial créé avec [Lovable](https://lovable.dev).
[Éditeur du projet](https://lovable.dev/projects/3ae40ce9-c603-4cb5-83f1-37ffeb4bdf4c).
