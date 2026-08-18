# MyLife Architecture Overview

**Last Updated**: 2026-08-18  
**Version**: Dual-app transitional architecture

---

## Executive Summary

MyLife is currently in a transitional state, running two parallel implementations:
1. **Legacy Application**: Vanilla JavaScript + Firebase (production)
2. **React Application**: React + TypeScript + Vite (development)

This document describes the current architecture of both systems and the migration strategy.

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Firebase Project                      │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Authentication │  │  Firestore   │  │   Hosting   │ │
│  └────────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
           │                    │                  │
           ├────────────────────┴──────────────────┤
           │                                       │
    ┌──────▼──────┐                        ┌──────▼──────┐
    │   Legacy    │                        │    React    │
    │     App     │                        │     App     │
    │ (deployed)  │                        │ (dev only)  │
    └─────────────┘                        └─────────────┘
```

### Current Deployment

- **Production**: Legacy app served from `dist/` via Firebase hosting
- **Development**: React app runs on `localhost:5173` (Vite dev server)
- **Backend**: Single Firebase project shared by both apps

---

## Legacy Application Architecture

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: Custom CSS with design tokens
- **Build**: Vite (builds to `dist/`)
- **Backend**: Firebase SDK 11.x
- **Database**: Cloud Firestore
- **Authentication**: Firebase Auth (Email/Password, Google, GitHub)

### Directory Structure

```
MyLife/
├── js/
│   ├── pages/           # Page-specific logic (11 files)
│   ├── repositories/    # Firestore data access (30 classes)
│   ├── services/        # Business logic (6 files)
│   └── firebase/        # Firebase initialization
├── css/
│   ├── global/          # Base styles, tokens, utilities
│   ├── components/      # Component styles
│   └── pages/           # Page-specific styles
├── html/                # HTML pages (11 features)
├── dist/                # Production build (deployed)
└── firebase/            # Firebase configuration
```

### Data Flow

```
HTML Page
    ↓
Page Controller (js/pages/*.js)
    ↓
Repository (js/repositories/*.js)
    ↓
Firebase Service (js/firebase/*.js)
    ↓
Firestore
```

### Features (11 total)

1. **Dashboard** — Overview and quick actions
2. **Todo** — Task management with categories
3. **Habits** — Daily habit tracking
4. **Goals** — Long-term goal tracking
5. **Calendar** — Integrated calendar view
6. **Workout** — Exercise logging
7. **Nutrition** — Meal tracking
8. **Study** — Study session management
9. **Prayer** — Islamic prayer times
10. **Quran** — Quran reading tracker
11. **Weather** — Weather integration

**Status**: All 11 features fully functional

---

## React Application Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite 6
- **Routing**: React Router v6 (with v7 future flags)
- **Styling**: CSS Modules + CSS Variables
- **Backend**: Firebase SDK 11.x
- **Database**: Cloud Firestore (shared with legacy)
- **State**: React Context API
- **Testing**: Playwright (E2E)

### Directory Structure

```
MyLife-React/
├── src/
│   ├── app/
│   │   ├── App.tsx              # Root component
│   │   ├── router.tsx           # Route configuration
│   │   ├── providers/           # Context providers
│   │   │   ├── AppProviders.tsx
│   │   │   ├── AuthProvider.tsx
│   │   │   └── ThemeProvider.tsx
│   │   ├── pages/               # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ResetPassword.tsx
│   │   │   └── FoundationPage.tsx
│   │   └── components/          # Shared components
│   │       ├── layout/          # AppShell, Header, Sidebar
│   │       ├── feedback/        # Loading, errors
│   │       └── navigation/
│   ├── services/
│   │   ├── firebase/            # Firebase services
│   │   │   ├── firebase.ts      # Initialization
│   │   │   ├── auth.ts          # Authentication
│   │   │   └── firestore.ts     # Firestore client
│   │   └── images/              # Image storage
│   ├── features/
│   │   └── dashboard/           # Dashboard feature module
│   ├── repositories/            # Data access layer (future)
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Utility functions
│   ├── types/                   # TypeScript types
│   └── styles/                  # Global styles
│       ├── globals.css
│       ├── variables.css
│       └── dashboard.css
├── tests/                       # Playwright tests
└── dist/                        # Production build (not deployed)
```

### Data Flow

```
Component
    ↓
Custom Hook (useAuth, useData)
    ↓
Repository (future pattern)
    ↓
Firebase Service (services/firebase/*.ts)
    ↓
Firestore
```

### Core Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **No Legacy Patterns**: No appData blob, no localStorage as database
3. **Lazy Loading**: Routes and features load on demand
4. **Strict Typing**: TypeScript strict mode enabled
5. **Clean Boundaries**: Component → Hook → Repository → Service → Firebase

### Features (2 migrated)

- ✅ **Authentication** (Phase 2)
- ✅ **Dashboard** (Phase 3)
- ❌ **Todo** through **Weather** (Phases 5-14)

---

## Shared Firebase Backend

### Firebase Project Configuration

**Services**:
- Authentication (Email/Password, Google, GitHub providers)
- Cloud Firestore (database)
- Hosting (serves legacy dist/)

### Firestore Collections

**Shared between both apps**:
```
/users/{userId}
  /todos
  /habits
  /goals
  /calendar-events
  /workouts
  /meals
  /study-sessions
  /prayer-logs
  /quran-progress
```

**Data Compatibility**: Both apps read/write the same schema

### Authentication Flow

Both apps use Firebase Auth:
1. User logs in via either app
2. Firebase generates auth token
3. Token stored in browser
4. Both apps recognize the same authenticated session

---

## Duplicate Systems

During migration, several systems are intentionally duplicated:

### 1. Firebase Initialization
- **Legacy**: `js/firebase/firebase.js`
- **React**: `src/services/firebase/firebase.ts`
- **Status**: Both required until Phase 15

### 2. Authentication Service
- **Legacy**: `js/services/AuthService.js` (65 references)
- **React**: `src/services/firebase/auth.ts` + `AuthProvider.tsx`
- **Status**: Both required until Phase 15

### 3. Firestore Service
- **Legacy**: `js/firebase/firestore.js`
- **React**: `src/services/firebase/firestore.ts`
- **Status**: Both required until Phase 15

### 4. Theme Management
- **Legacy**: `js/services/ThemeManager.js`
- **React**: `src/app/providers/ThemeProvider.tsx`
- **Status**: Both required until Phase 15

### 5. CSS Design Tokens
- **Legacy**: `css/global/variables.css`
- **React**: `src/styles/variables.css`
- **Overlap**: 80% identical tokens
- **Status**: Consolidate in Phase 15

### 6. Repository Pattern
- **Legacy**: 30 class-based repositories
- **React**: Functional TypeScript exports (future)
- **Status**: Both required during migration

### 7. Dashboard Implementation
- **Legacy**: `js/pages/custom-dashboard.js` + `html/dashboard.html`
- **React**: `src/app/pages/Dashboard.tsx` + `src/features/dashboard/`
- **Status**: Legacy Dashboard deprecated but not deleted yet

See [Duplicate Systems](DUPLICATE_SYSTEMS.md) for consolidation timeline.

---

## Migration Strategy

### Phased Approach

**Phase 1**: Legacy audit (complete)
**Phase 2**: React foundation (complete)
**Phase 3**: Dashboard migration (complete)
**Phase 4**: Project cleanup (in progress)
**Phases 5-14**: Feature-by-feature migration
**Phase 15**: Final consolidation and legacy removal

### Coexistence Strategy

During migration:
1. Both apps remain fully functional
2. Legacy app stays in production
3. React app developed in parallel
4. Shared Firebase backend ensures data consistency
5. No user-facing disruption

### Cutover Strategy (Phase 15)

1. Verify all features migrated
2. Update firebase.json: `"public": "MyLife-React/dist"`
3. Deploy React app to Firebase hosting
4. Delete legacy code (js/, css/, html/)
5. Consolidate duplicate systems
6. Final verification

---

## Performance Considerations

### Legacy App
- No bundling (individual script tags)
- No code splitting
- All features loaded on page load
- Firebase initialized once per page

### React App
- Vite bundling with tree-shaking
- Route-based code splitting
- Lazy component loading
- Firebase initialized once per session
- Optimized production builds

---

## Security

### Authentication
- Firebase Auth handles all authentication
- No passwords stored locally
- Secure token management
- Provider linking supported (Email + Google + GitHub)

### Data Access
- Firestore security rules enforce user-level access
- All database queries scoped to authenticated user
- No direct Firestore calls from components (React)

### Environment Variables
- Firebase config in `.env` files (not committed)
- API keys in environment variables
- Separate dev/prod configurations

---

## Development Workflow

### Legacy App
```bash
npm install
npm run dev  # Vite dev server on localhost:4173
```

### React App
```bash
cd MyLife-React
npm install
npm run dev  # Vite dev server on localhost:5173
```

### Building for Production

**Legacy** (currently deployed):
```bash
npm run build  # → dist/
firebase deploy
```

**React** (future):
```bash
cd MyLife-React
npm run build  # → MyLife-React/dist/
# (not deployed yet)
```

---

## Testing Strategy

### Legacy App
- Manual testing
- No automated test suite

### React App
- Playwright E2E tests
- Runtime verification
- Visual parity testing
- Responsive design testing
- TypeScript type checking

---

## Documentation

### Architecture Documentation
- This file: Overall architecture
- [Duplicate Systems](DUPLICATE_SYSTEMS.md): Duplication analysis
- [Migration Status](../migration/MIGRATION_STATUS.md): Progress tracking

### Historical Documentation
- [Phase 1 Reports](../archive/phase1/): Legacy audit
- [Phase 2 Reports](../archive/phase2/): React foundation
- [Phase 3 Reports](../archive/phase3/): Dashboard migration

---

**Next Update**: After Phase 4 completion or significant architecture changes