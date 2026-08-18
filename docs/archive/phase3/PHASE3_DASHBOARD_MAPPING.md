# Phase 3 Legacy to React Mapping

| Legacy | React | Notes |
|---|---|---|
| `pages/dashboard.html` | `app/pages/Dashboard.tsx` | Protected route and feature composition |
| `renderDashboard()` | `DashboardOverview.tsx` | Hero, quick actions, summaries, events, activity |
| `custom-dashboard.js` | `DashboardGrid.tsx` | React state replaces manual DOM mutation |
| `buildWidgetCard()` | `DashboardWidget.tsx` | Sortable card and controls |
| `WidgetRegistry.js` | `dashboardService.ts/WIDGETS` | Same 17 stable widget IDs |
| `dashboard-widget-defs.js` | `WidgetContent.tsx` | Real Firestore/API/client behavior |
| Widget store modal | `AddWidgetDialog` | Restores hidden widgets or appends placements |
| Personalization modal | `PersonalizationDialog` | Same five persisted preferences |
| Native drag events | dnd-kit sortable context | Pointer and keyboard sensors; state is authoritative |
| `DashboardLayoutService` | `dashboardRepository` + `useDashboardLayout` | Same Firestore document and 400ms debounce |
| `RepoAggregatorSync` | `useDashboardData` | Shared typed subscriptions without `window.currentData` |
| concrete legacy repositories | `dashboardRepository` | Same `{module}/{uid}/items` paths |
| `currentData.profile.quickNotes` | `users/{uid}.quickNotes` | Debounced merge update |
| `weather-dashboard.js` | `Weather` widget | Abortable API request; no leaked interval |
| shared theme/language controls | `ThemeProvider`, `Header` | Semantic tokens and centralized document direction |
| shared export | `Dashboard.exportDashboard()` | Downloads current dashboard state |

No feature-page CRUD UI was migrated. Dashboard links continue to the prepared protected routes for later phases.
