/**
 * services/images/LocalImageService.js
 * ---------------------------------------------------------------------------
 * Local implementation of the Image Service using IndexedDB.
 * Store images inside IndexedDB, NOT LocalStorage, NOT Firestore, and NOT Firebase.
 */

const DB_NAME = 'MomentumImageDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/**
 * Helper to open IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      resolve(e.target.result);
    };
    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

export class LocalImageService {
  /**
   * Saves an image in IndexedDB with a unique ID and optional metadata.
   * @param {string} id - The image identifier.
   * @param {string} dataUrl - The base64 data URL of the image.
   * @param {Object} [metadata] - Optional image metadata.
   * @returns {Promise<string>} The image identifier.
   */
  static async saveImage(id, dataUrl, metadata = {}) {
    if (!id) throw new Error('Image ID is required to save an image.');
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id, dataUrl, metadata, updatedAt: new Date().toISOString() });
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Loads an image's base64 data URL from IndexedDB by its unique ID.
   * @param {string} id - The image identifier.
   * @returns {Promise<string|null>} The image dataUrl or null if not found.
   */
  static async loadImage(id) {
    if (!id) return null;
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result ? request.result.dataUrl : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletes an image from IndexedDB.
   * @param {string} id - The image identifier.
   * @returns {Promise<void>}
   */
  static async deleteImage(id) {
    if (!id) return;
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generates a compressed and resized preview data URL for a given file.
   * Consolidation of photo compression, resize, and preview helpers.
   * @param {File} file - The file selected from input.
   * @param {number} [maxDim=900] - Maximum dimension for width or height.
   * @param {number} [quality=0.72] - JPEG quality compression ratio.
   * @returns {Promise<string>} A promise resolving to the compressed data URL.
   */
  static getPreview(file, maxDim = 900, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > h && w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else if (h >= w && h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => reject(new Error('Failed to load image for compression.'));
        img.src = reader.result;
      };
      reader.onerror = (err) => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  }
}
