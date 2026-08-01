# MyLife (Momentum)

A personal productivity & Islamic-lifestyle app — Todo, Habits, Goals,
Calendar, Workout, Nutrition, Study, Prayer, Quran, Weather, Statistics, and
Settings in one place, with 9 visual themes and English/German/Arabic/French
support (including RTL).

## Status

**v1.0.0.** Firebase Authentication, Cloud Firestore, and the Repository
Pattern are in place (see `ARCHITECTURE.md`). **Only the Todo module is
fully migrated onto Firestore** — every other module still uses the
original LocalStorage-based data model. This is a deliberate, disclosed,
incremental migration, not an oversight; see `MIGRATION_NOTES_PHASE2.md` and
`FINAL_QA_REPORT_PHASE6.md` for exactly what is and isn't on Firestore
today.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Firebase project config
npm run dev                   # local dev server — serves any page directly
```

```bash
npm run build                 # production build -> dist/
npm run preview               # serve the production build locally
```

## Deploying

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

See `ARCHITECTURE.md` → "Deployment" for the cache-header reasoning behind
`firebase.json`.

## Documentation map

| Doc | Covers |
|---|---|
| `ARCHITECTURE.md` | Folder structure, Firebase flow, Repository Pattern, build process, env vars, deployment |
| `AUTHENTICATION.md` | Auth flow, provider linking, error mapping, profile sync, session lifecycle |
| `DESIGN_SYSTEM.md` | Design tokens, shared components, the Phase 3 UI fixes |
| `MIGRATION_NOTES_PHASE2.md` | What's actually migrated to Firestore vs. still LocalStorage |
| `FINAL_REPORT_PHASE4.md` | PWA/performance/security production-hardening |
| `FINAL_REPORT_PHASE5.md` | OAuth/authentication UI work |
| `FINAL_QA_REPORT_PHASE6.md` | v1.0 release readiness — bugs found & fixed, known limitations, release checklist |

## Requirements

- Node.js 18+ (for the Vite build step)
- A Firebase project with Authentication (Email/Password, Google, GitHub
  providers enabled) and Cloud Firestore
