# MyLife - React Application

Modern React + TypeScript implementation of the MyLife productivity application.

## Status

**Completed Phases**:
- ✅ Phase 2: Core foundation (auth, routing, theme, app shell)
- ✅ Phase 3: Dashboard feature migration

**Current Phase**: Phase 4 - Project cleanup and consolidation

**Next**: Phase 5-14 - Feature-by-feature migration (Todo, Habits, Goals, etc.)

## Project Structure

```
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   ├── providers/
│   │   ├── AppProviders.tsx
│   │   ├── AuthProvider.tsx
│   │   └── ThemeProvider.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   └── Dashboard.tsx
│   └── components/
│       ├── layout/
│       │   ├── AppShell.tsx
│       │   ├── Header.tsx
│       │   └── Sidebar.tsx
│       ├── feedback/
│       │   ├── AppLoading.tsx
│       │   ├── RouteLoading.tsx
│       │   └── ErrorBoundary.tsx
│       ├── navigation/
│       └── common/
├── services/
│   ├── firebase/
│   │   ├── firebase.ts
│   │   ├── auth.ts
│   │   └── firestore.ts
│   ├── images/
│   └── weather/
├── repositories/
├── hooks/
├── utils/
├── types/
│   ├── auth.ts
│   ├── common.ts
│   └── firebase.ts
├── features/
├── styles/
│   ├── globals.css
│   └── variables.css
└── main.tsx
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- Firebase project (get credentials from Firebase Console)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Then fill in your Firebase credentials:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Development

```bash
npm run dev
```

The app will start at `http://localhost:5173`

### Building

```bash
npm run build
```

Output goes to `dist/`

### Type Checking

```bash
npm run type-check
```

## Architecture

See [Architecture Overview](../docs/architecture/ARCHITECTURE.md) for detailed architectural decisions.

### Core Principles

- **Single responsibility** — Each module has one clear purpose
- **No legacy patterns** — No LegacyDataSync, appData blob, localStorage as database
- **Lazy loading** — Routes and features load on demand
- **Strict typing** — TypeScript strict mode enabled
- **Clean boundaries** — Component → Hook → Repository → Service → Firebase

### Authentication Flow

1. Firebase is the only auth source
2. Auth state change → AuthProvider updates context
3. Protected routes redirect unauthenticated users to `/login`
4. Session persists across page refresh via Firebase auth listener

### Data Flow

```
Component
  ↓
Hook (useAuth, useData)
  ↓
Repository (BaseRepository)
  ↓
Firebase Service (auth.ts, firestore.ts)
  ↓
Firebase
```

Direct Firestore calls from components are forbidden.

### Theme System

- Supported: `light`, `dark`, `system`
- Persisted in localStorage (UI preference only)
- CSS variables for easy customization
- Responds to system preference changes in `system` mode

### Error Handling

- ErrorBoundary catches React rendering errors
- Firebase errors mapped to user-safe messages
- Network errors distinguished from permission errors
- Development mode shows error details in console

## Testing

### Manual Test Gate

Before considering Phase 2 complete, run all tests in `PHASE2_TEST_REPORT.md`:

- [ ] Development server starts
- [ ] Production build succeeds
- [ ] TypeScript passes
- [ ] Login works
- [ ] Logout works
- [ ] Protected routes work
- [ ] Theme switching works
- [ ] RTL support works
- [ ] Responsive design works (320px–1440px)
- [ ] No console errors

## Performance

- Firebase initialized once
- Auth listener created once (no duplicates)
- Lazy-loaded routes with Suspense
- Minimal providers, no unnecessary Context nesting
- Code split by route
- No global Firestore listeners
- No data loaded on startup

## RTL Support

The application supports Arabic and RTL layouts:

- Logical CSS properties (`margin-inline`, `padding-inline`)
- No hardcoded `left`/`right` positioning
- `dir="rtl"` attribute support prepared
- Layout reversal handled by CSS

## Next Steps

Phase 2 focuses only on the foundation:

- ✅ React + Vite + TypeScript
- ✅ Authentication
- ✅ Routing
- ✅ App Shell
- ✅ Theme System
- ✅ Error Handling
- ✅ Loading States
- ❌ Feature migration (Phase 3+)

Features like Todo, Habits, Goals will be migrated incrementally in later phases.

## Documentation

- [Architecture Overview](../docs/architecture/ARCHITECTURE.md)
- [Migration Status](../docs/migration/MIGRATION_STATUS.md)
- [Phase 2 Reports](../docs/archive/phase2/) — Historical Phase 2 documentation
- [Phase 3 Reports](../docs/archive/phase3/) — Dashboard migration documentation

## License

Proprietary
