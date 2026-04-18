import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  listAll, 
  deleteObject 
} from 'firebase/storage';
import { storage } from './firebase';

/**
 * Custom error classes for Firebase Storage operations
 */
export class StorageError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageUploadError extends StorageError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = 'StorageUploadError';
  }
}

export class StorageRetrievalError extends StorageError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = 'StorageRetrievalError';
  }
}

export class StorageDeletionError extends StorageError {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.name = 'StorageDeletionError';
  }
}

/**
 * Uploads an image to Firebase Storage at the specified path.
 * 
 * @param file The file to upload
 * @param path The full path in storage
 * @returns The download URL of the uploaded image
 */
export const uploadImage = async (file: File | Blob, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error(`[StorageService] Upload failed for path: ${path}`, error);
    throw new StorageUploadError(`Failed to upload image to ${path}`, error);
  }
};

/**
 * Uploads a file to Firebase Storage with progress tracking and resumability.
 * 
 * @param file The file to upload
 * @param path The full path in storage
 * @param onProgress Callback function for progress updates (0-100)
 * @returns The download URL
 */
export const uploadFileResumable = (
  file: File | Blob, 
  path: string, 
  onProgress: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(Math.round(progress));
      },
      (error) => {
        console.error(`[StorageService] Resumable upload error details:`, {
          code: error.code,
          message: error.message,
          serverResponse: error.serverResponse,
          path
        });
        reject(new StorageUploadError(`Failed to upload file to ${path}`, error));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(new StorageRetrievalError(`Failed to get download URL after upload`, error));
        }
      }
    );
  });
};

/**
 * Retrieves the download URL for an image at the specified path.
 * 
 * @param path The full path in storage
 * @returns The download URL
 */
export const getImageUrl = async (path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error(`[StorageService] Retrieval failed for path: ${path}`, error);
    throw new StorageRetrievalError(`Failed to get image URL from ${path}`, error);
  }
};

/**
 * Lists all image download URLs under a specific path prefix.
 * 
 * @param pathPrefix The path prefix to list images from
 * @returns An array of download URLs
 */
export const listImages = async (pathPrefix: string): Promise<string[]> => {
  try {
    const listRef = ref(storage, pathPrefix);
    const res = await listAll(listRef);
    const urlPromises = res.items.map((itemRef) => getDownloadURL(itemRef));
    return await Promise.all(urlPromises);
  } catch (error) {
    console.error(`[StorageService] Listing failed for prefix: ${pathPrefix}`, error);
    throw new StorageRetrievalError(`Failed to list images from ${pathPrefix}`, error);
  }
};

/**
 * Deletes an image at the specified path.
 * 
 * @param path The full path in storage
 */
export const deleteImage = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error(`[StorageService] Deletion failed for path: ${path}`, error);
    throw new StorageDeletionError(`Failed to delete image at ${path}`, error);
  }
};

/**
 * Uploads a product image with a standardized path structure.
 * 
 * @param file The blob of the image to upload
 * @param productId The ID of the product
 * @returns The permanent download URL
 */
export const uploadProductImage = async (file: Blob, productId: string): Promise<string> => {
  try {
    const path = `products/${productId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error(`[StorageService] Upload product image failed for ${productId}`, error);
    throw new StorageUploadError(`Failed to upload product image to Firebase Storage`, error);
  }
};

export const storageService = {
  uploadImage,
  uploadFileResumable,
  getImageUrl,
  listImages,
  deleteImage,
  uploadProductImage
};
