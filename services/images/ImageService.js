/**
 * services/images/ImageService.js
 * ---------------------------------------------------------------------------
 * Image Service abstraction layer. Exposes ONLY saveImage, loadImage,
 * deleteImage, and getPreview.
 *
 * The rest of the application should never know where images are stored
 * or which provider (local IndexedDB vs cloud) is active behind this interface.
 */

import { LocalImageService } from './LocalImageService.js';

export class ImageService {
  /**
   * Saves an image with a unique ID and optional metadata.
   * @param {string} id
   * @param {string} dataUrl
   * @param {Object} [metadata]
   * @returns {Promise<string>} Image reference identifier or URL.
   */
  static saveImage(id, dataUrl, metadata = {}) {
    return LocalImageService.saveImage(id, dataUrl, metadata);
  }

  /**
   * Loads an image by its identifier.
   * @param {string} id
   * @returns {Promise<string|null>} The image data URL.
   */
  static loadImage(id) {
    return LocalImageService.loadImage(id);
  }

  /**
   * Deletes an image by its identifier.
   * @param {string} id
   * @returns {Promise<void>}
   */
  static deleteImage(id) {
    return LocalImageService.deleteImage(id);
  }

  /**
   * Generates a preview for a selected file (handles compression and resizing).
   * @param {File} file
   * @returns {Promise<string>} A promise resolving to a compressed data URL.
   */
  static getPreview(file) {
    return LocalImageService.getPreview(file);
  }
}
