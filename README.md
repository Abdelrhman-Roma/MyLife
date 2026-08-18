# MyLife

A personal productivity & Islamic-lifestyle application integrating Todo, Habits, Goals, Calendar, Workout, Nutrition, Study, Prayer, Quran, Weather, Statistics, and Settings.

## Status

**Migration in Progress**: Transitioning from legacy vanilla JavaScript application to modern React + TypeScript architecture.

**Completed**:
- ✅ Phase 1: Legacy app audit and migration planning
- ✅ Phase 2: React foundation (authentication, routing, theme, app shell)
- ✅ Phase 3: Dashboard feature migration
- 🔄 Phase 4: Project cleanup and consolidation (in progress)

**Migration Progress**: 2 of 11 features migrated to React (18%)
- ✅ Dashboard
- ✅ Authentication
- ❌ Todo, Habits, Goals, Calendar, Workout, Nutrition, Study, Prayer, Quran, Weather

See [Migration Status](docs/migration/MIGRATION_STATUS.md) for detailed progress and roadmap.

## Quick Start

**Legacy Application** (currently deployed):
```bash
npm install
cp .env.example .env.local   # fill in Firebase config
npm run dev
```

**React Application** (in development):
```bash
cd MyLife-React
npm install
cp .env.example .env
npm run dev
```

## Documentation

- [Migration Status](docs/migration/MIGRATION_STATUS.md) — Current progress, roadmap
- [Architecture Overview](docs/architecture/ARCHITECTURE.md) — System design
- [React Application](MyLife-React/README.md) — React app setup and architecture
- [Documentation Index](docs/README.md) — Full documentation map

## Deployment

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

Currently deploys the legacy application. React application deployment planned for Phase 15 (final migration).

## Requirements

- Node.js 18+
- Firebase project with Authentication and Cloud Firestore

## License

Proprietary
