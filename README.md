# Parinator

Application de paris amicaux sans argent réel.

## Build du front dans l'API

```bash
cd frontend
bun install
bun run build
```

Le build React est généré dans `backend/public` par `frontend/build.ts` avec `Bun.build` et le pipeline Tailwind côté Bun. L'API Rust sert ensuite directement le front et le fallback SPA.

## Lancer l'API Rust

```bash
cd backend
cp .env.example .env
cargo run
```

L'application complète écoute par défaut sur `http://127.0.0.1:8080`.

## Dev front séparé

```bash
cd frontend
bun install
bun run dev
```

Le serveur Vite reste optionnel pour le développement. Le build de référence est `bun run build`, servi ensuite par l'API Rust.

## Fonctionnalités incluses

- Création de compte avec pseudo et mail uniques.
- Mot de passe hashé côté API.
- Connexion par pseudo ou mail avec token JWT.
- Invitations d'amis, acceptation et suppression.
- Création de paris avec deux côtés, cotes, mise fictive et invitations.
- Vue des paris personnels, invitations et paris des amis.
- Partage d'un pari via lien `/join/<code>`.
- Résolution du pari par l'initiateur.
- Calcul des dettes fictives et marquage comme réglé.
- WebSocket pour événements temps réel: amis, invitations, résultats, dettes.
