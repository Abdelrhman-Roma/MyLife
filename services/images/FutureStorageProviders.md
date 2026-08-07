# Future Storage Providers Blueprint

This document outlines the roadmap and integration design to seamlessly swap the local IndexedDB image storage architecture for cloud storage providers (such as Amazon S3, Cloudinary, or any other private object storage), without changing the front-end page controllers or repository code.

---

## Architecture Overview

The image architecture consists of a clean interface abstraction:

```
  Front-End (Pages / Repositories)
                 │
                 ▼
       [ ImageService.js ]
                 │
         ┌───────┴───────┐
         ▼               ▼
[ LocalImageService ]  [ S3ImageService ]  ... (Other cloud providers)
 (IndexedDB Storage)   (S3/Cloud Storage)
```

The rest of the application ONLY interacts with `ImageService`. It is entirely decoupled from how or where images are stored.

---

## Image Service Interface Contract

Any future storage provider MUST implement the exact same interface signature as defined by the `ImageService` specification:

### 1. `saveImage(id, dataUrl, metadata)`
* **Parameters:**
  * `id` (`string`): Unique image identifier.
  * `dataUrl` (`string`): The base64-encoded image string.
  * `metadata` (`Object`): Optional key-value metadata.
* **Returns:** `Promise<string>`
  * A promise resolving to the storage resource reference or download URL.

### 2. `loadImage(id)`
* **Parameters:**
  * `id` (`string`): Unique image identifier or resource key.
* **Returns:** `Promise<string|null>`
  * A promise resolving to the displayable image source (either local base64, cached URL, or signed CDN URL).

### 3. `deleteImage(id)`
* **Parameters:**
  * `id` (`string`): Unique image identifier.
* **Returns:** `Promise<void>`

### 4. `getPreview(file)`
* **Parameters:**
  * `file` (`File`): A local browser `File` object from an `<input type="file">`.
* **Returns:** `Promise<string>`
  * A promise resolving to a compressed/resized JPEG data URL suitable for immediate previewing and saving.

---

## Step-by-Step Transition to Cloud Providers

### Step 1: Implement the Cloud Service
Create a new file, e.g., `services/images/S3ImageService.js`:

```javascript
export class S3ImageService {
  static async saveImage(id, dataUrl, metadata = {}) {
    // 1. Convert base64 dataUrl to a binary blob or file
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // 2. Upload blob to cloud (e.g. AWS S3 bucket, Cloudinary API, etc.)
    const uploadUrl = `https://your-bucket.s3.amazonaws.com/images/${id}`;
    await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'image/jpeg',
        ...metadata
      }
    });

    return id; // Return resource ID or public URL
  }

  static async loadImage(id) {
    // Return direct S3 bucket URL, signed URL, or fetch and cache
    return `https://your-bucket.s3.amazonaws.com/images/${id}`;
  }

  static async deleteImage(id) {
    // Delete file from the cloud bucket
    const deleteUrl = `https://your-api.com/delete/images/${id}`;
    await fetch(deleteUrl, { method: 'DELETE' });
  }

  static getPreview(file) {
    // Cloud provider can reuse local resizing & compression or cloud-side transformation
    return LocalImageService.getPreview(file);
  }
}
```

### Step 2: Swap Provider inside `ImageService.js`
In `services/images/ImageService.js`, import the newly created service and point the static delegates to it:

```javascript
// Import the new cloud provider instead of LocalImageService
import { S3ImageService as SelectedProvider } from './S3ImageService.js';

export class ImageService {
  static saveImage(id, dataUrl, metadata = {}) {
    return SelectedProvider.saveImage(id, dataUrl, metadata);
  }

  static loadImage(id) {
    return SelectedProvider.loadImage(id);
  }

  static deleteImage(id) {
    return SelectedProvider.deleteImage(id);
  }

  static getPreview(file) {
    return SelectedProvider.getPreview(file);
  }
}
```

No front-end elements, component stylesheets, or Firestore database code needs to change. The migration is complete within seconds.
