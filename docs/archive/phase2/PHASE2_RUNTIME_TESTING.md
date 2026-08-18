# Phase 2.2 Runtime Verification Guide

**Project:** MyLife-React  
**Date:** 2026-08-16  
**Status:** Ready for Manual Testing

---

## Automated Verification Completed

### ✅ Server Health
- Dev server started successfully on `http://localhost:5173`
- HTML served correctly
- Vite dev server ready in 214ms

### ✅ Static File Verification
- index.html loads correctly
- React modules loaded
- Main entry point `/src/main.tsx` referenced correctly
- Title set to "MyLife - Momentum"

---

## Manual Testing Instructions

Since Playwright is not installed, complete these manual tests in a real browser.

---

## TEST 1: Application Startup

### Steps:
1. Open browser
2. Navigate to `http://localhost:5173`
3. Wait for page to load
4. Open DevTools (F12)
5. Check Console tab for errors

### What to Verify:
- [ ] Page loads without blank screen
- [ ] No error messages in console
- [ ] No "Cannot find module" errors
- [ ] No "ReferenceError" or "TypeError"
- [ ] React appears to initialize
- [ ] No infinite loading spinner

### Expected Outcome:
You should see the login page or a loading state, depending on whether you're already authenticated.

### Record:
```
Startup time: _____ seconds
First meaningful render: _____ ms
Console errors: [ ] none  [ ] some (list below)

Errors found:
_________________________________
_________________________________
```

---

## TEST 2: Login Page Rendering

### Steps:
1. If not on login page, navigate to `http://localhost:5173/login`
2. Inspect the page elements

### What to Verify:
- [ ] Login form visible
- [ ] Email input field visible
- [ ] Password input field visible
- [ ] Login button visible
- [ ] "MyLife" title visible
- [ ] "Momentum" subtitle visible
- [ ] Form is centered and styled
- [ ] No console errors

### Expected Layout:
```
    MyLife
   Momentum

Email:     [________________]
Password:  [________________]

    [Login Button]
```

### Record:
```
Login page renders: [ ] YES  [ ] NO
All form fields visible: [ ] YES  [ ] NO
Any styling issues: [ ] YES  [ ] NO
Console errors: [ ] none  [ ] some (count: ___)
```

---

## TEST 3: Authentication Flow

### Prerequisites:
- Have a valid Firebase test account
- Know the email and password

### Test 3A: Valid Login

**Steps:**
1. Enter valid email in email field
2. Enter valid password in password field
3. Click Login button
4. Wait for response
5. Observe page changes

**What to Verify:**
- [ ] Login button shows loading state ("Logging in...")
- [ ] No error message appears
- [ ] Page redirects to dashboard
- [ ] Dashboard loads successfully
- [ ] User email visible in header
- [ ] No console errors
- [ ] No redirect loop

**Record:**
```
Login succeeded: [ ] YES  [ ] NO
Redirect to dashboard: [ ] YES  [ ] NO
Time to redirect: _____ seconds
Console errors: [ ] none  [ ] some
```

### Test 3B: Invalid Login

**Steps:**
1. Go back to login page (if redirected to dashboard)
2. Enter wrong email/password
3. Click Login button
4. Observe error

**What to Verify:**
- [ ] Error message appears
- [ ] Error is user-friendly (not raw Firebase error)
- [ ] Still on login page (no redirect)
- [ ] Can retry login
- [ ] No console errors

**Record:**
```
Error message shown: [ ] YES  [ ] NO
Error text: "_____________________________"
User can retry: [ ] YES  [ ] NO
```

### Test 3C: Auth Persistence on Refresh

**Steps:**
1. Successfully login (complete Test 3A)
2. On dashboard, press F5 to refresh
3. Wait for page to reload
4. Observe state

**What to Verify:**
- [ ] Loading state appears briefly
- [ ] Dashboard reloads (NOT redirect to login)
- [ ] User remains authenticated
- [ ] No redirect loop
- [ ] No blank screen
- [ ] User email still shown
- [ ] No console errors

**CRITICAL:** This tests the previous MyLife bug where refresh would log you out.

**Record:**
```
Refresh maintains auth: [ ] YES  [ ] NO
No redirect loop: [ ] YES  [ ] NO
Auth persists: [ ] YES  [ ] NO
```

### Test 3D: Logout

**Steps:**
1. On dashboard
2. Click "Logout" button in header
3. Observe state

**What to Verify:**
- [ ] Logout button shows loading state
- [ ] Redirects to login page
- [ ] Email field is empty
- [ ] Password field is empty
- [ ] Cannot access dashboard directly
- [ ] No console errors

**Record:**
```
Logout succeeded: [ ] YES  [ ] NO
Redirected to login: [ ] YES  [ ] NO
Auth cleared: [ ] YES  [ ] NO
```

---

## TEST 4: Routing

### Test 4A: Public Route (/login)

**Steps:**
1. Logout (or use private browsing)
2. Navigate to `http://localhost:5173/login`

**What to Verify:**
- [ ] Login page loads
- [ ] No redirect
- [ ] No blank screen

**Record:**
```
Public route accessible: [ ] YES  [ ] NO
```

### Test 4B: Protected Route (/dashboard)

**Steps:**
1. Logout (or use private browsing)
2. Navigate directly to `http://localhost:5173/dashboard`

**What to Verify:**
- [ ] Redirects to /login immediately
- [ ] Dashboard briefly visible (if at all)
- [ ] No authentication leak

**Record:**
```
Protected route redirects: [ ] YES  [ ] NO
```

### Test 4C: Protected Route (Authenticated)

**Steps:**
1. Login
2. Navigate to `http://localhost:5173/dashboard`

**What to Verify:**
- [ ] Dashboard loads
- [ ] No redirect to login
- [ ] Page renders correctly

**Record:**
```
Authenticated can access: [ ] YES  [ ] NO
```

### Test 4D: Unknown Route

**Steps:**
1. Navigate to `http://localhost:5173/unknown-page-xyz`

**What to Verify:**
- [ ] Redirects to /dashboard (catch-all)
- [ ] No 404 page
- [ ] No blank screen

**Record:**
```
Unknown route handled: [ ] YES  [ ] NO
```

---

## TEST 5: Theme Switching

### Test 5A: Light Theme

**Steps:**
1. On dashboard
2. Find theme selector (dropdown with Light/Dark/System)
3. Select "Light"
4. Observe colors change

**What to Verify:**
- [ ] Background becomes light/white
- [ ] Text becomes dark
- [ ] Sidebar color changes
- [ ] Header color changes
- [ ] No layout breaks
- [ ] No console errors

**Record:**
```
Light theme works: [ ] YES  [ ] NO
Colors correct: [ ] YES  [ ] NO
Layout stable: [ ] YES  [ ] NO
```

### Test 5B: Dark Theme

**Steps:**
1. Select "Dark" from theme dropdown
2. Observe colors change

**What to Verify:**
- [ ] Background becomes dark
- [ ] Text becomes light
- [ ] All UI updates
- [ ] No layout breaks
- [ ] No console errors

**Record:**
```
Dark theme works: [ ] YES  [ ] NO
Colors correct: [ ] YES  [ ] NO
Layout stable: [ ] YES  [ ] NO
```

### Test 5C: System Theme

**Steps:**
1. Select "System" from theme dropdown
2. Observe theme matches OS

**What to Verify:**
- [ ] Theme matches system preference
- [ ] If OS is dark, app is dark
- [ ] If OS is light, app is light
- [ ] No console errors

**Record:**
```
System theme works: [ ] YES  [ ] NO
Matches OS: [ ] YES  [ ] NO
```

### Test 5D: Theme Persistence

**Steps:**
1. Select "Dark" theme
2. Refresh page (F5)
3. Observe theme

**What to Verify:**
- [ ] Dark theme persists after refresh
- [ ] No flash of light theme
- [ ] localStorage contains preference

**Record:**
```
Theme persists: [ ] YES  [ ] NO
No flash: [ ] YES  [ ] NO
```

---

## TEST 6: Responsive Design

Test each viewport size. For each size, verify:
- [ ] No horizontal scrollbar
- [ ] All content visible
- [ ] Buttons clickable
- [ ] Text readable
- [ ] Layout not broken

### Using Browser DevTools:

1. Press F12 to open DevTools
2. Click device toggle (Ctrl+Shift+M)
3. Test each size below

### Viewport Sizes to Test:

#### Mobile (320px)
- [ ] No horizontal scroll
- [ ] Sidebar usable
- [ ] Content readable

#### Mobile (375px)
- [ ] No horizontal scroll
- [ ] Forms usable
- [ ] Buttons clickable

#### Tablet (768px)
- [ ] No horizontal scroll
- [ ] Layout responsive
- [ ] Header usable

#### Tablet (1024px)
- [ ] No horizontal scroll
- [ ] Sidebar responsive
- [ ] Content well-positioned

#### Desktop (1280px)
- [ ] All elements visible
- [ ] Layout balanced
- [ ] No excessive whitespace

#### Desktop (1440px)
- [ ] Clean layout
- [ ] Content centered if needed
- [ ] No overflow

#### Large (1920px)
- [ ] Graceful scaling
- [ ] Not too spread out
- [ ] Still readable

### Record:
```
Responsive sizes tested: ___ / 7

| Size | No Scroll | Usable | Record |
|------|-----------|--------|--------|
| 320  | [ ]       | [ ]    |        |
| 375  | [ ]       | [ ]    |        |
| 768  | [ ]       | [ ]    |        |
| 1024 | [ ]       | [ ]    |        |
| 1280 | [ ]       | [ ]    |        |
| 1440 | [ ]       | [ ]    |        |
| 1920 | [ ]       | [ ]    |        |
```

---

## TEST 7: RTL/LTR Foundation

### Steps:
1. Open DevTools Console
2. Paste this code:
```javascript
document.documentElement.dir = 'rtl'
document.documentElement.lang = 'ar'
```
3. Press Enter
4. Observe layout changes

### What to Verify:
- [ ] Layout direction changes
- [ ] Sidebar moves to right (if visible)
- [ ] Header adapts
- [ ] No horizontal overflow
- [ ] Content still accessible
- [ ] Text alignment correct

### To Revert:
```javascript
document.documentElement.dir = 'ltr'
document.documentElement.lang = 'en'
```

### Record:
```
RTL toggle works: [ ] YES  [ ] NO
No horizontal scroll: [ ] YES  [ ] NO
Content accessible: [ ] YES  [ ] NO
```

---

## TEST 8: Error Boundary

### Manual Error Test (Development Only)

**Steps:**
1. Open DevTools Console
2. Paste:
```javascript
// This will throw an error
throw new Error('Test error for ErrorBoundary')
```
3. Press Enter
4. Observe page

**What to Verify:**
- [ ] Error caught (application doesn't completely crash)
- [ ] Error message shown (in dev console)
- [ ] Page still functions

**Note:** Error Boundary catches render errors, not thrown errors. This test verifies the page stability.

### Record:
```
Page recovers from errors: [ ] YES  [ ] NO
```

---

## TEST 9: Loading States

### AppLoading
- Observe during initial page load
- Should appear briefly while Firebase initializes
- Record: Appeared: [ ] YES  [ ] NO

### RouteLoading
- Navigate to `/dashboard` (lazy-loaded route)
- Should briefly show loading
- Record: Appeared: [ ] YES  [ ] NO

---

## TEST 10: Console Validation

### Steps:
1. Open DevTools Console (F12)
2. Perform the following:
   - [ ] Load app
   - [ ] Login
   - [ ] Navigate dashboard
   - [ ] Change theme
   - [ ] Refresh
   - [ ] Logout
3. Check Console tab for each action

### Errors to Watch For:
- [ ] ReferenceError
- [ ] TypeError
- [ ] SyntaxError
- [ ] FirebaseError (uncaught)
- [ ] "Cannot find module"
- [ ] "is not a function"
- [ ] Network 404 errors

### Record:
```
Total errors found: ___
Critical errors: ___
Minor warnings: ___

List errors:
_________________________________
_________________________________
_________________________________
```

---

## TEST 11: Firebase Runtime

### In DevTools Network Tab:

1. Filter by XHR/Fetch
2. Perform login
3. Observe requests

**What to Verify:**
- [ ] Firebase auth requests successful
- [ ] Firestore requests successful (if any)
- [ ] No duplicate requests
- [ ] No auth errors
- [ ] No 403/401 errors

### Record:
```
Firebase requests successful: [ ] YES  [ ] NO
Duplicate requests: [ ] NONE  [ ] SOME
Auth errors: [ ] NONE  [ ] SOME
```

---

## TEST 12: Navigation Leak Check

### Steps:
1. Open DevTools Console
2. Navigate: Dashboard → Login → Dashboard → Login → Dashboard
3. Watch for duplicated listeners or warnings

### What to Verify:
- [ ] No repeated Firebase initialization messages
- [ ] No memory warnings
- [ ] Application remains responsive
- [ ] No console errors after repeated navigation

### Record:
```
Repeated navigation stable: [ ] YES  [ ] NO
No memory leaks detected: [ ] YES  [ ] NO
```

---

## TEST 13: Build Verification

### Final Production Build

**Steps:**
```bash
npm run build
```

**What to Verify:**
- [ ] Build completes successfully
- [ ] No build errors
- [ ] dist/ folder created
- [ ] All chunks generated
- [ ] Source maps created

### Record:
```
Build successful: [ ] YES  [ ] NO
Build time: _____ seconds
Errors: [ ] NONE  [ ] SOME
```

---

## Summary Table

| Test | Status | Notes |
|------|--------|-------|
| Startup | [ ] PASS [ ] FAIL | |
| Login Page | [ ] PASS [ ] FAIL | |
| Valid Login | [ ] PASS [ ] FAIL | |
| Invalid Login | [ ] PASS [ ] FAIL | |
| Auth Persistence | [ ] PASS [ ] FAIL | **CRITICAL** |
| Logout | [ ] PASS [ ] FAIL | |
| Public Routes | [ ] PASS [ ] FAIL | |
| Protected Routes | [ ] PASS [ ] FAIL | |
| Unknown Routes | [ ] PASS [ ] FAIL | |
| Light Theme | [ ] PASS [ ] FAIL | |
| Dark Theme | [ ] PASS [ ] FAIL | |
| System Theme | [ ] PASS [ ] FAIL | |
| Theme Persistence | [ ] PASS [ ] FAIL | |
| Mobile 320px | [ ] PASS [ ] FAIL | |
| Mobile 375px | [ ] PASS [ ] FAIL | |
| Tablet 768px | [ ] PASS [ ] FAIL | |
| Tablet 1024px | [ ] PASS [ ] FAIL | |
| Desktop 1280px | [ ] PASS [ ] FAIL | |
| Desktop 1440px | [ ] PASS [ ] FAIL | |
| Desktop 1920px | [ ] PASS [ ] FAIL | |
| RTL Foundation | [ ] PASS [ ] FAIL | |
| Console Errors | [ ] PASS [ ] FAIL | |
| Firebase Runtime | [ ] PASS [ ] FAIL | |
| Navigation Stability | [ ] PASS [ ] FAIL | |
| Production Build | [ ] PASS [ ] FAIL | |

---

## Installation of Playwright (Optional)

If you want automated testing, install Playwright:

```bash
npm install -D @playwright/test
npx playwright install
```

Then create `tests/phase2-runtime.spec.ts` for automated tests.

---

## Next Steps

1. Complete all manual tests above
2. Record results in this document
3. Fix any CRITICAL or HIGH issues
4. Re-run `npm run type-check` and `npm run build`
5. Once all tests pass, update `PHASE2_FINAL_VERIFICATION_REPORT.md`
6. Declare Phase 2 READY FOR PHASE 3

---

## Tester Information

**Tester Name:** ________________________  
**Test Date:** ________________________  
**Browser:** ________________________  
**OS:** ________________________  
**Node Version:** ________________________  

