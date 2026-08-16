# Déployer Eros-V1 sur Render

Le dépôt contient déjà tout ce qu'il faut : `render.yaml` (Blueprint), les scripts
`build:render` / `start:render`, et le build Nitro en mode serveur Node.

## 1. Créer le service

1. Pousse le projet sur GitHub (via Lovable > GitHub).
2. Sur Render : **New > Blueprint**, sélectionne le dépôt. `render.yaml` est détecté
   automatiquement (service web Node, build + start déjà configurés).
3. Alternative manuelle (**New > Web Service**) :
   - Build Command : `npm install && npm run build:render`
   - Start Command : `npm run start:render`
   - Health Check Path : `/`

## 2. Variables d'environnement

Déjà pré-remplies dans `render.yaml` :

| Variable | Rôle |
| --- | --- |
| `NITRO_PRESET=node-server` | build serveur Node (au lieu de Cloudflare) |
| `NODE_VERSION=22.11.0` | runtime Node |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` | accès backend côté serveur |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | accès backend côté navigateur |

À saisir **une seule fois** dans Render (marquées `sync: false`, donc secrètes) :

| Variable | Où la récupérer |
| --- | --- |
| `LOVABLE_API_KEY` | clé du moteur IA (AI Gateway) — indispensable aux analyses |
| `SUPABASE_SERVICE_ROLE_KEY` | clé d'administration de la base — utilisée par les analyses et l'auto-apprentissage |

> Ces deux clés ne sont pas lisibles depuis Lovable Cloud : il faut les fournir
> depuis ta propre source (AI Gateway pour la clé IA, projet backend pour la clé
> service role). Sans elles, l'app démarre mais les prédictions échouent.

`PORT` est fourni automatiquement par Render — ne pas le définir.

## 3. Vérifications

- Logs Render : `Listening on http://0.0.0.0:$PORT`
- Ouvre l'URL `.onrender.com`, teste une analyse pré-match puis `/live`.

Le déploiement Lovable (Publish) reste inchangé : le preset Node ne s'active que
lorsque `NITRO_PRESET` est défini, donc uniquement sur Render.
