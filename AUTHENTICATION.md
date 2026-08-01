# MyLife — Authentication (Phase 5)

## Honest scope statement — read this first

This phase adds real Google/GitHub OAuth sign-in (via `services/AuthService.js`,
built in Phase 1) to the login/register page, plus a Connected Accounts
panel on the profile page. It does **not** migrate the existing email/
password login/register flow off the old local (LocalStorage) system, and
it does **not** rewire `bootShell()` (the session guard every one of the 12
pages uses) onto Firebase Auth directly. Instead, it adds a **documented
bridge** (see "Session Lifecycle," below) so the two systems interoperate
today without a much larger, separate migration. That migration — making
Firebase Auth the single source of truth for session state everywhere — is
explicitly flagged as the top item in Remaining Technical Debt.

## Authentication flow

```
EMAIL (unchanged, old local system)
  index.html form submit -> shared.js login()/register()
    -> localStorage users[] + SESSION_KEY
    -> bootShell() on every other page reads SESSION_KEY synchronously

GOOGLE / GITHUB (new, real Firebase Auth)
  index.html "Continue with Google/GitHub" button click
    -> js/pages/auth-oauth.js -> AuthService.signInWithProvider(id)
    -> firebase/auth.js signInWithPopup(GoogleAuthProvider|GithubAuthProvider)
    -> on success: AuthService._syncProfileFromAuthUser() writes/updates
       users/{uid} in Firestore (displayName, photoURL, emailVerified,
       lastLoginAt, lastProvider)
    -> auth-oauth.js ALSO bridges into the local session system (creates a
       local user record + SESSION_KEY, oauthOnly:true) so bootShell() on
       unmigrated pages recognizes the session
    -> redirect to dashboard, reusing the page's existing success
       transition (confetti/page-veil/button morph — unchanged)
```

## Provider linking

Handled by `AuthService.linkProvider(providerId)` / `unlinkProvider(providerId)`:

- **Linking** checks `user.providerData` client-side first (so a
  "provider-already-linked" case never even reaches Firebase), then calls
  `linkWithPopup()`. If the provider identity being linked is already
  attached to a *different* Firebase user, Firebase itself throws
  `credential-already-in-use` — this is surfaced via `ErrorMapper` as a
  clear message, not auto-merged (the client SDK cannot safely merge two
  accounts' data on its own; that would need a server-side Cloud Function
  and is out of scope here).
- **Unlinking** refuses client-side, before ever calling Firebase, if
  `user.providerData.length <= 1` — "never allow users to remove their last
  login method," enforced at the one call site both the button-disable
  logic and the actual unlink share (`AuthService.unlinkProvider`), so
  there's no way to bypass it by, say, calling the method directly from the
  console — the check lives in the service, not just the UI.
- **`account-exists-with-different-credential`** (signing in with a
  provider whose email already has an account under a *different*
  provider): mapped to a clear message telling the user which method to
  use instead, rather than silently creating a second account or failing
  opaquely.

## Error mapping (new this phase)

Added to `core/ErrorMapper.js`'s `CODE_MAP`:
`popup-closed-by-user`, `cancelled-popup-request`, `popup-blocked`,
`account-exists-with-different-credential`, `credential-already-in-use`,
`provider-already-linked`, `no-such-provider`, `user-token-expired`,
`user-mismatch` — each with a category (`validation`/`auth-expired`), a
friendly message, and a `retryable` flag, following the exact pattern the
rest of the app's error handling already uses (see Phase 1's
`core/ErrorMapper.js`). Not yet localized into German/Arabic/French — see
Remaining Technical Debt.

## Profile synchronization

`AuthService._syncProfileFromAuthUser(user, providerId)` is the one place
this happens, called after every successful sign-in (email password login
is NOT yet routed through this — see Remaining Technical Debt) and after
every successful provider link. It writes: `email`, `displayName`,
`photoURL`, `emailVerified`, `lastLoginAt`, `lastProvider` to `users/{uid}`.
Existing profile fields (e.g. settings) are preserved — this only patches
the fields it owns, via `UserService.updateProfile()`, not a full
overwrite.

## Avatar resolution

`AuthService.getAvatar()`: prefers the signed-in user's `photoURL` (Google
and GitHub both provide one); falls back to a deterministically-generated
initials avatar (2 letters, color chosen from a fixed palette seeded by the
user's uid) if no photo is available — never an empty/broken `<img>`. The
Connected Accounts panel also has an `onerror` handler on the `<img>` tag
itself as a second line of defense, in case a provider's photo URL goes
stale/404s after the fact.

## Session lifecycle

**Restore**: `AuthService.waitUntilReady()` resolves once Firebase's own
`onAuthStateChanged` has fired for the first time on page load — this is
what "session restore"/"auto login" means for the Firebase side. The
Connected Accounts panel awaits this before rendering, so it never flashes
a "not signed in" state incorrectly during the brief window Firebase takes
to restore.

**Expiration/refresh**: handled entirely by the Firebase SDK itself
(ID tokens auto-refresh in the background); `user-token-expired` and
`requires-recent-login` are mapped to clear "please sign in again" messages
for the specific operations (like changing a password) that require a
fresh credential.

**The local-session bridge** (see Authentication Flow, above) is a
deliberate, temporary interoperability layer — not a second, permanent
auth system. It exists solely so a user who signs in with Google/GitHub can
still navigate to any of the 11 not-yet-migrated pages today. It does not
attempt to detect a *revoked* or *disabled* Firebase user and reflect that
into the bridged local session — see Remaining Technical Debt.

## Remaining authentication technical debt

1. **`bootShell()` still checks the old local session, not Firebase Auth,
   directly.** The bridge (above) makes this work today for OAuth users,
   but it's a stopgap. The real fix is migrating `bootShell()` (and the 11
   pages that call it) onto `AuthService.waitUntilReady()` / `onAuthStateChange()`
   as the actual source of truth — a substantial, separate migration.
2. **Email/password login still doesn't go through Firebase Auth or
   `AuthService` at all** — it's the pre-Phase-1 local system, unchanged.
   `_syncProfileFromAuthUser()` is never called for an email/password
   sign-in today.
3. **Session expiration/revocation/disabled-account detection is not
   reflected into the local bridge.** If a Firebase user's account is
   disabled or their session is revoked server-side, `AuthService` itself
   will correctly reflect that on its next check, but the bridged local
   session (a separate, independent localStorage flag) has no mechanism to
   notice and sign the user out of the *other* 11 pages.
4. **New error messages are English-only** — not yet added to
   `locales/de.js`/`ar.js`/`fr.js`, which continues the pattern flagged
   repeatedly in earlier phases' localization audits.
5. **Email disconnect/reconnect ("Connect Email" from an OAuth-only
   account) is not implemented** — the Connected Accounts panel shows
   Email's status but has no button for it, since that flow (setting an
   initial password for a user who has never had one) needs its own
   dedicated form, not a popup, and was out of scope to add well in this
   pass.
6. **No rate-limiting/race-condition protection beyond what Firebase Auth
   already provides natively** (e.g. `too-many-requests`) — no additional
   client-side debounce was added to the new OAuth buttons beyond
   disabling both buttons for the duration of an in-flight attempt.

## Recommendations for future authentication enhancements

1. Prioritize the `bootShell()` → Firebase-Auth-as-source-of-truth
   migration — it's the one item everything else in this list is a stopgap
   for.
2. Add the "Connect Email / set a password" flow for OAuth-only accounts.
3. Localize the new error messages.
4. Consider a Cloud Function for safe account-merging when
   `credential-already-in-use` is hit, if that becomes a real user need.
5. Add a lightweight periodic `getIdToken(true)` refresh check (or listen
   for Firebase's own token-refresh events) and propagate a detected
   disabled/deleted account into a forced sign-out of the bridged local
   session too, closing the gap in item 3 above.
