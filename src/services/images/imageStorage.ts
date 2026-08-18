import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { app } from '../firebase/firebase'

const storage = getStorage(app)

function userImagePath(userId: string, category: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `users/${userId}/${category}/${crypto.randomUUID()}-${safeName}`
}

export async function uploadImage(
  userId: string,
  file: File,
  category = 'uploads'
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded.')
  }

  const objectRef = ref(storage, userImagePath(userId, category, file.name))
  const snapshot = await uploadBytes(objectRef, file, { contentType: file.type })
  return snapshot.ref.fullPath
}

export async function deleteImage(path: string): Promise<void> {
  await deleteObject(ref(storage, path))
}

export function getImageUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path))
}

export function getAvatarUrl(userId: string, fileName: string): Promise<string> {
  return getImageUrl(`users/${userId}/avatar/${fileName}`)
}

export function getCoverUrl(userId: string, fileName: string): Promise<string> {
  return getImageUrl(`users/${userId}/cover/${fileName}`)
}
