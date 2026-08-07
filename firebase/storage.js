/**
 * firebase/storage.js
 * ---------------------------------------------------------------------------
 * Thin Firebase Storage wrapper, matching firebase/auth.js and
 * firebase/firestore.js's pattern exactly: this file is the only place that
 * touches the Storage SDK directly. Everything else imports from here.
 *
 * Added in the enterprise refactor's Phase 6 specifically to stop storing
 * images as base64 data URIs inside Firestore documents (Profile avatar/
 * cover, Workout progress photos) — Firestore has a 1MB per-document limit,
 * and base64 encoding itself adds ~33% overhead on top of the image's real
 * size, so a handful of photos could silently fail to save. Firebase
 * Storage is the correct product for binary blobs; Firestore documents then
 * hold only the resulting download URL.
 */

import {
  getStorage, ref as storageRef, uploadString, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { app } from './firebase.js';

const storage = app ? getStorage(app) : null;

function assertStorage() {
  if (!storage) throw new Error('Firebase Storage is not initialized (missing config).');
}

/**
 * Uploads a base64 data URL (e.g. from a <canvas>/file-reader image picker)
 * and returns its public download URL.
 * @param {string} path - e.g. `profile/${uid}/avatar.jpg`
 * @param {string} dataUrl - a `data:image/...;base64,...` string
 * @returns {Promise<string>} download URL
 */
export async function uploadDataUrl(path, dataUrl) {
  assertStorage();
  const ref = storageRef(storage, path);
  await uploadString(ref, dataUrl, 'data_url');
  return getDownloadURL(ref);
}

/** @param {string} path */
export async function deleteFile(path) {
  assertStorage();
  try {
    await deleteObject(storageRef(storage, path));
  } catch (error) {
    // Deleting something that's already gone (or never existed) shouldn't
    // block the caller — e.g. removing a profile photo that failed to
    // finish uploading last time. Any other error still propagates.
    if (error?.code !== 'storage/object-not-found') throw error;
  }
}
