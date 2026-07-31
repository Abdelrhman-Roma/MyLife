/**
 * firebase/firestore.js
 * ---------------------------------------------------------------------------
 * Thin, reusable wrapper around the Firestore SDK, bound to the single `db`
 * instance exported by firebase/firebase.js.
 *
 * Like firebase/auth.js, this file has no business logic of its own — it
 * exists so repositories/BaseRepository.js (and nothing else) is the only
 * place that needs to know these Firestore SDK function names. If the SDK
 * itself ever changes, only this file needs to change.
 */

import {
  collection as _collection,
  doc as _doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';

/** @param {string} path @param {...string} pathSegments */
export function collectionRef(path, ...pathSegments) {
  return _collection(db, path, ...pathSegments);
}

/** @param {string} path @param {...string} pathSegments */
export function docRef(path, ...pathSegments) {
  return _doc(db, path, ...pathSegments);
}

export {
  db,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  runTransaction,
  serverTimestamp,
  Timestamp,
};
