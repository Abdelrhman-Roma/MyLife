# STORAGE_REPORT.md

## New file: `firebase/storage.js`

Matches `firebase/auth.js`/`firebase/firestore.js`'s exact pattern — the one file that touches the Storage SDK directly. Two exports: `uploadDataUrl(path, dataUrl)` (upload + return download URL) and `deleteFile(path)` (delete, swallowing "already gone" errors so cleanup calls don't need their own existence check).

## Why this was necessary, not optional

Two domains stored images as base64 `dataUrl` strings directly inside Firestore documents: Profile avatar/cover (`js/pages/account.js`) and Workout progress photos (`js/workout.js`). Firestore documents cap out at 1MB, and base64 encoding adds roughly 33% on top of the original image's byte size — meaning a real, non-trivial photo could fail to save with no warning beyond a generic Firestore error, and even a successful save would make that one document unusually expensive to read every time it's fetched. Your brief called this out explicitly for Progress Photos ("Never use Base64. Never exceed Firestore document limits.") — the same reasoning applies identically to Profile photos, so I applied the same fix to both rather than leaving one inconsistent.

## What changed for each

- **Profile avatar/cover:** upload to `profile/{uid}/avatar.jpg` / `profile/{uid}/cover.jpg`. The Firestore `profile/{uid}` document now stores a download URL, not image bytes.
- **Progress photos:** upload to `progressPhotos/{uid}/{photoId}.jpg`. The Firestore `progressPhotos/{uid}/items/{id}` document stores `{date, url}`, not `{date, dataUrl}`.

Both keep the same user-facing behavior: pick/take a photo, see it appear immediately (an optimistic local preview using the original data URL while the upload happens in the background), with the real Storage URL swapped in once the upload resolves. If the upload fails, the photo stays visible locally but a toast warns it may not have synced — rather than silently losing the "it looks like it worked" state the user just saw.

## Security rules: `storage.rules` (new file)

Owner-scoped, matching `firestore.rules`' pattern exactly: a user can only read/write files under their own `uid`. Also enforces a 5MB per-file size cap and requires an `image/*` content type — neither of these existed before (there was no Storage usage at all), so there was no prior behavior to preserve; these are the minimum sane defaults for a photo-upload feature. Wired into `firebase.json`'s new `storage` config block so `firebase deploy` will actually publish these rules.

## A CSP bug this surfaced, fixed in `firebase.json`

The existing Content-Security-Policy header's `img-src` directive allowed `'self'`, `data:`, and two OAuth-avatar domains (Google, GitHub) — but not Firebase Storage's download-URL domain (`firebasestorage.googleapis.com`). Without this fix, every uploaded photo would have uploaded successfully and then failed to *display*, blocked by the browser's own CSP enforcement, with no obvious connection between "I set up Storage rules correctly" and "the image still doesn't show." Added `https://firebasestorage.googleapis.com` to `img-src`. This is exactly the kind of gap that's invisible until you actually try to render an uploaded image — caught here by walking through the full upload → save → render path before considering Storage integration complete, not by assumption.

## Not verified live

Uploading a real file, confirming it lands in the Storage bucket, confirming the download URL renders under the new CSP, and confirming the security rules correctly reject a non-owner's read/write attempt all require a live Firebase project and a browser — none of which are available in this environment. Structurally verified (build succeeds, rules are syntactically valid, the CSP change is a straightforward domain addition) but not click-tested, consistent with every other claim in this phase.
