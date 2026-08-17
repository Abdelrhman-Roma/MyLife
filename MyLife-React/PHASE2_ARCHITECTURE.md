# Phase 2 Architecture Documentation

**Project:** MyLife - Momentum React Rebuild  
**Phase:** 2 - Core React Architecture & Application Shell  
**Date:** 2026-08-16  
**Status:** Implementation Complete

---

## 1. Architecture Overview

Phase 2 establishes a production-grade React + Vite + TypeScript foundation that is clean, scalable, and free of legacy architectural problems from the previous version.

### Design Principles

1. **Single Source of Truth** — Firebase Auth/Firestore only
2. **Lazy Loading** — Routes, features, and components load on demand
3. **Strict Separation** — UI layer → Business logic → Data access → Firebase
4. **Type Safety** — TypeScript strict mode enforced
5. **Performance First** — Minimal initial bundle, no startup data loading
6. **Accessibility** — RTL-ready, responsive, error boundaries
7. **Maintainability** — One responsibility per module

---

## 2. Folder Structure

```
MyLife-React/
├── src/
│   ├── app/
│   │   ├── App.tsx                         # Main component
│   │   ├── router.tsx                      # React Router setup + protected routes
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── providers/
│   │   │   ├── AppProviders.tsx            # Provider composition
│   │   │   ├── AuthProvider.tsx            # Firebase auth state + context
│   │   │   └── ThemeProvider.tsx           # Theme management
│   │   └── components/
│   │       ├── layout/
│   │       │   ├── AppShell.tsx            # Main layout wrapper
│   │       │   ├── Header.tsx              # Top navigation
│   │       │   └── Sidebar.tsx             # Side navigation
│   │       ├── feedback/
│   │       │   ├── AppLoading.tsx          # App initialization loading
│   │       │   ├── RouteLoading.tsx        # Lazy route loading
│   │       │   └── ErrorBoundary.tsx       # React error boundary
│   │       ├── navigation/
│   │       └── common/
│   │
│   ├── services/
│   │   └── firebase/
│   │       ├── firebase.ts                 # Firebase app initialization (once only)
│   │       ├── auth.ts                     # Auth operations: sign in, register, logout
│   │       └── firestore.ts                # Firestore initialization + persistence
│   │
│   ├── repositories/                       # Data access layer (phase 3+)
│   ├── hooks/                              # Custom React hooks
│   ├── utils/                              # Helper functions
│   ├── types/
│   │   ├── auth.ts
│   │   ├── common.ts
│   │   └── firebase.ts
│   ├── features/                           # Feature modules (phase 3+)
│   │
│   ├── styles/
│   │   ├── globals.css                     # Global styles, responsive, RTL
│   │   └── variables.css                   # CSS custom properties (tokens)
│   │
│   └── main.tsx                            # React entry point
│
├── index.html                              # HTML template
├── vite.config.ts                          # Vite build configuration
├── tsconfig.json                           # TypeScript strict mode
├── tsconfig.node.json                      # Vite config typing
├── package.json
├── .env.example                            # Environment template
└── README.md
```

---

## 3. Authentication Architecture

### Firebase Auth as Single Source of Truth

**Principle:** Firebase Authentication is the ONLY authentication system.

**Forbidden patterns (v1.0 problems):**
- ❌ `mylife.session` object
- ❌ localStorage auth tokens
- ❌ Custom session bridge
- ❌ Duplicate auth listeners

### AuthProvider Implementation

**File:** `src/app/providers/AuthProvider.tsx`

**Responsibilities:**
1. Listen to Firebase auth state changes via `onAuthStateChanged`
2. Expose user, loading, isAuthenticated, and auth methods via context
3. Handle initial app load (show loading spinner until auth resolves)
4. Never store auth state in localStorage

**Auth Methods Exposed:**
- `signIn(email, password)` → Firebase email/password
- `signOut()` → Clear session
- `signUp(email, password)` → Create account
- `resetPassword(email)` → Send reset email

**Flow:**

```
App Start
  ↓
AuthProvider mounts
  ↓
onAuthStateChanged listener attached
  ↓
If user exists: setUser(user), setLoading(false)
If no user: setUser(null), setLoading(false)
  ↓
Update triggers context subscribers
  ↓
Components re-render with new auth state
```

### Session Restoration on Refresh

When user refreshes the page:

1. Firebase SDK automatically restores session from IndexedDB
2. `onAuthStateChanged` fires with the restored user
3. AuthProvider updates context
4. Protected routes can now render dashboard
5. No blank screen, no redirect loop

---

## 4. Routing Architecture

### React Router v6 Setup

**File:** `src/app/router.tsx`

**Protected Route Pattern:**

```typescript
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

If unauthenticated → redirect to `/login`  
If authenticated → render component

**Public Route Pattern:**

```typescript
<PublicRoute>
  <Login />
</PublicRoute>
```

If unauthenticated → render login  
If authenticated → redirect to `/dashboard`

### Routes

| Route | Type | Component |
|-------|------|-----------|
| `/login` | Public | Login form |
| `/dashboard` | Protected | Main dashboard with AppShell |
| `/` | Redirect | → `/dashboard` |
| `*` | Catch-all | → `/dashboard` |

### Lazy Loading

Dashboard and future pages use `React.lazy()`:

```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'))
```

**Benefits:**
- Dashboard code not in initial bundle
- Loaded only when user navigates
- Fallback to `<RouteLoading />` during load
- Reduces initial bundle size

---

## 5. Provider Architecture

### Provider Composition

**File:** `src/app/providers/AppProviders.tsx`

```
AppProviders
├── AuthProvider (Firebase auth state)
├── ThemeProvider (Light/Dark/System theme)
└── Router (React Router with routes)
```

**Benefits of this structure:**
- Router last so it can use auth/theme
- AuthProvider first so all pages access auth
- ThemeProvider independent of auth
- No unnecessary nesting
- Clear dependency order

**Entry point flow:**

```
main.tsx
  ↓
AppProviders
  ↓
AuthProvider (auth state)
  ↓
ThemeProvider (theme state)
  ↓
Router (routes and pages)
  ↓
Pages/Components
```

---

## 6. Firebase Architecture

### Single Initialization

**File:** `src/services/firebase/firebase.ts`

```typescript
const app = initializeApp(firebaseConfig)
export { app }
```

**Key points:**
- Initialized exactly once
- Environment variables from `.env`
- Error if config missing
- All other services import this app instance

### Auth Service

**File:** `src/services/firebase/auth.ts`

- `getAuth(app)` called once
- Exports `auth` singleton
- Functions: `signInWithEmail`, `registerUser`, `signOutUser`, `sendPasswordReset`
- Error handling: Maps Firebase errors to user-safe messages

### Firestore Service

**File:** `src/services/firebase/firestore.ts`

- `getFirestore(app)` called once
- Persistence enabled (IndexedDB + multi-tab sync)
- Exported as `db` singleton

### Why This Structure

```
Component
  ↓
Hook (future)
  ↓
Repository (future)
  ↓
Firebase Service
  ↓
Firebase SDK
```

**Benefits:**
- Components never call Firebase directly
- Easy to mock/test repositories
- Single responsibility per file
- Future-proof for migration

---

## 7. Theme Architecture

### ThemeProvider Implementation

**File:** `src/app/providers/ThemeProvider.tsx`

**Theme Options:**
- `light` — Forces light theme
- `dark` — Forces dark theme
- `system` — Follows OS preference, responds to changes

**Persistence:**
- Stored in localStorage key `mylife-theme-preference`
- ⚠️ localStorage is allowed ONLY for UI preferences

**CSS Integration:**

```typescript
document.documentElement.setAttribute('data-theme', 'dark')
document.documentElement.classList.toggle('dark', true)
```

**CSS Variables Switch:**

```css
html[data-theme='dark'] {
  --color-bg-primary: #0f172a;
  --color-text-primary: #f8fafc;
}

html[data-theme='light'] {
  --color-bg-primary: #ffffff;
  --color-text-primary: #1a1a1a;
}
```

### System Preference Listening

When theme is `system`, app listens to OS changes:

```typescript
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
mediaQuery.addEventListener('change', handleChange)
```

---

## 8. Application Shell

### AppShell Component

**File:** `src/app/components/layout/AppShell.tsx`

**Structure:**

```
AppShell
├── Sidebar (navigation)
├── AppShell-Main
│   ├── Header (with theme switcher, logout)
│   └── Content (page outlet)
```

**Responsibilities:**
- Manage sidebar open/close state
- Render header with user menu
- Render sidebar with navigation
- Render main content area
- Support mobile responsive layout

### Header Component

**File:** `src/app/components/layout/Header.tsx`

- Hamburger menu to toggle sidebar
- Theme selector (Light/Dark/System)
- User email display
- Logout button

### Sidebar Component

**File:** `src/app/components/layout/Sidebar.tsx`

- Navigation links (placeholder for now)
- Collapsible on mobile
- Responsive: full width on mobile, side panel on desktop

---

## 9. Error Handling

### Error Boundary

**File:** `src/app/components/feedback/ErrorBoundary.tsx`

**Catches:**
- React rendering errors
- Lifecycle method errors
- Constructor errors

**Does NOT catch:**
- Event handlers (use try/catch)
- Async code (use `.catch()`)
- Server-side rendering errors

**Fallback UI:**
- Friendly error message
- Development mode shows error details
- "Go Home" button to reset

### Firebase Error Mapping

**File:** `src/services/firebase/auth.ts`

Maps Firebase error codes to user-safe messages:

```
auth/user-not-found → "User not found"
auth/wrong-password → "Incorrect password"
auth/too-many-requests → "Too many login attempts..."
```

---

## 10. Loading States

### AppLoading

**File:** `src/app/components/feedback/AppLoading.tsx`

Shown during:
- Firebase initialization
- Auth state check on app start
- Before AuthProvider resolves `loading`

### RouteLoading

**File:** `src/app/components/feedback/RouteLoading.tsx`

Shown during:
- Lazy route loading (Suspense fallback)
- Code splitting delays

### Global Loading Flow

```
Browser Load
  ↓
React renders
  ↓
AppProviders mounts
  ↓
AuthProvider: loading = true, show AppLoading
  ↓
Firebase auth state resolves
  ↓
AuthProvider: loading = false
  ↓
Router renders (now knows if authenticated)
  ↓
User sees login or dashboard
```

---

## 11. Responsive Design

### Breakpoints

```css
Mobile: 320px – 767px
Tablet: 768px – 1023px
Desktop: 1024px+
```

### Testing Viewport Sizes

- 320px (iPhone 5)
- 375px (iPhone SE)
- 768px (iPad)
- 1024px (iPad Pro)
- 1280px (Desktop)
- 1440px (Large Desktop)

### Responsive Rules

✅ Sidebar: Side panel on desktop, horizontal nav on mobile  
✅ Header: Adapts layout, hides user email on small screens  
✅ Content: Padding adjusts, font sizes scale  
❌ No horizontal scroll at any size  
❌ No fixed-width layouts

---

## 12. RTL Support

### CSS Logical Properties

**Instead of:**
```css
margin-left: 1rem;
padding-right: 2rem;
```

**Use:**
```css
margin-inline-start: 1rem;
padding-inline-end: 2rem;
```

### Implementation

- CSS variables work in RTL
- Flexbox layout naturally reverses
- `dir="rtl"` attribute support prepared
- No hardcoded `left`/`right` in layout CSS
- Input fields keep `direction: ltr` for RTL text input

### Future: Language Toggle

When Arabic is selected:
```typescript
document.documentElement.dir = 'rtl'
document.documentElement.lang = 'ar'
```

---

## 13. TypeScript Strictness

### Strict Mode Enabled

**File:** `tsconfig.json`

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

### Enforcement Rules

- ✅ All types explicit (no `any`)
- ✅ All function parameters typed
- ✅ All return types explicit
- ✅ No unused variables
- ❌ No `@ts-ignore`
- ❌ No `@ts-expect-error` (unless documented)

### Type Files

- `src/types/auth.ts` — Authentication types
- `src/types/common.ts` — Shared types
- `src/types/firebase.ts` — Firebase-specific types

---

## 14. Performance Strategy

### Bundle Size Optimization

- Firebase vendor chunk separated (`firebase-vendor.js`)
- Routes lazy-loaded
- CSS code-split per route
- No unused dependencies

### Runtime Performance

**Optimization:** Firebase initialized once
```typescript
// firebase.ts - runs once at app start
const app = initializeApp(firebaseConfig)
```

**Optimization:** Auth listener created once
```typescript
// AuthProvider.tsx - useEffect dependency is empty
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(...)
  return () => unsubscribe()
}, []) // runs once on mount
```

**Optimization:** No startup data loading
- Dashboard doesn't fetch all todos on load
- Features load data on-demand when needed
- Firestore persistence handles offline access

**Optimization:** Minimal provider nesting
- Only 3 providers: Auth, Theme, Router
- No unnecessary Context consumers

---

## 15. Development Diagnostics

### Development-Only Features

- Error boundary shows full stack in dev mode
- Firebase SDK emits warnings (monitored via console)
- React StrictMode catches side effects
- No permanent console.log statements

### Monitoring Performance

Use Chrome DevTools Performance tab:

1. Open `/login`
2. Record Performance
3. Login
4. Navigate to `/dashboard`

Check for:
- ✅ One Firebase initialization
- ✅ One auth state change
- ✅ No repeated renders
- ❌ No network waterfall delays

---

## 16. Security Considerations

### Auth Security

- Firebase Auth handles password hashing
- No passwords stored in code
- Token management handled by Firebase SDK
- Session restoration automatic and secure

### Firestore Security

- Rules enforced server-side (not by client code)
- User ID-based collection partitioning prepared
- No sensitive data in localStorage

### Environment Variables

- Never commit `.env` file
- `.env.example` shows required keys (no secrets)
- `import.meta.env.VITE_*` for Vite variables

---

## 17. Known Limitations & Future Work

### Phase 2 Scope (Foundation Only)

**Not implemented yet:**
- Feature modules (Todo, Habits, Goals, etc.) — Phase 3+
- Repositories for data access — Will be added in Phase 3
- Firestore integration with components — Phase 3+
- Advanced error recovery — Phase 4+

### Deliberate Exclusions

- ❌ Firebase Storage (not needed for MVP)
- ❌ Analytics (Phase 4+)
- ❌ Cloud Functions (Phase 4+)
- ❌ Real-time syncing across tabs (Firestore rules handle this)

---

## 18. Testing Checklist

### Completed Manual Tests

- [x] Dev server starts without errors
- [x] Production build succeeds
- [x] TypeScript: 0 errors
- [x] Login page renders
- [x] Authentication flow works
- [x] Logout functionality works
- [x] Protected routes work
- [x] Page refresh doesn't break auth
- [x] Theme switching works
- [x] RTL structure prepared
- [x] Responsive layout works
- [x] No console errors
- [x] Error Boundary catches errors
- [x] Loading states display correctly

---

## 19. Decisions for Phase 3

### Next Phase Priorities

1. **Repositories** — Create base repository for Firestore CRUD
2. **Todo Migration** — First feature to migrate from vanilla JS
3. **Hooks** — Custom hooks for data fetching and state
4. **Tests** — Unit and integration tests
5. **CI/CD** — GitHub Actions workflow

### Architecture Readiness

- ✅ Layer separation ready (Component → Hook → Repository → Firebase)
- ✅ Type system ready for data models
- ✅ Error handling ready for data layer errors
- ✅ Loading states ready for data fetching

---

## 20. Comparison to v1.0 Problems

### Avoided Problems

| v1.0 Problem | Phase 2 Solution |
|---|---|
| Duplicate auth systems | Firebase Auth only (single source of truth) |
| mylife.session blob | Firebase auth context |
| localStorage as DB | Only for UI preferences (theme) |
| Direct Firestore in components | Repository layer enforces separation |
| Global listeners on startup | Data loaded on-demand |
| Circular dependencies | Clear layer structure |
| Missing TypeScript | Strict mode enabled |
| Large shared.js | Small, focused modules |

---

## 21. Deployment

### Build Process

```bash
npm run build
```

Outputs to `dist/` ready for Firebase Hosting.

### Deployment Checklist

- [ ] `.env` configured with production values
- [ ] TypeScript passes: `npm run type-check`
- [ ] Build succeeds: `npm run build`
- [ ] No production secrets in code
- [ ] Firebase Firestore rules configured
- [ ] Firebase Auth providers enabled

---

## Summary

Phase 2 establishes a **clean, scalable, production-ready React foundation** that:

✅ Eliminates v1.0 architectural problems  
✅ Implements proper separation of concerns  
✅ Enables incremental feature migration  
✅ Supports RTL and i18n from the start  
✅ Prioritizes performance and type safety  
✅ Provides clear patterns for future phases  

The architecture is ready for Phase 3 feature migration.
