import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadImage, uploadFileResumable, getImageUrl, listImages, deleteImage } from './storageService';
import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  listAll, 
  deleteObject 
} from 'firebase/storage';

// Mock firebase/storage
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  uploadBytesResumable: vi.fn(),
  getDownloadURL: vi.fn(),
  listAll: vi.fn(),
  deleteObject: vi.fn()
}));

// Mock firebase configuration
vi.mock('./firebase', () => ({
  storage: {}
}));

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFileResumable', () => {
    it('should upload a file and report progress', async () => {
      const mockFile = new File([''], 'test.zip', { type: 'application/zip' });
      const mockPath = 'branch_communications/bywood/large.zip';
      const mockUrl = 'https://firebasestorage.com/large.zip';
      
      const mockUploadTask = {
        on: vi.fn((event, progressFn, errorFn, successFn) => {
          // Simulate progress
          progressFn({ bytesTransferred: 50, totalBytes: 100 });
          progressFn({ bytesTransferred: 100, totalBytes: 100 });
          // Simulate success
          successFn();
        }),
        snapshot: { ref: {} }
      };

      (uploadBytesResumable as any).mockReturnValue(mockUploadTask);
      (getDownloadURL as any).mockResolvedValue(mockUrl);

      const progressCallback = vi.fn();
      const result = await uploadFileResumable(mockFile, mockPath, progressCallback);

      expect(uploadBytesResumable).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(100);
      expect(result).toBe(mockUrl);
    });
  });

  describe('uploadImage', () => {
    it('should upload an image and return download URL', async () => {
      const mockFile = new File([''], 'test.png', { type: 'image/png' });
      const mockPath = 'branch_communications/bywood/img1';
      const mockUrl = 'https://firebasestorage.com/img1';
      
      (uploadBytes as any).mockResolvedValue({ ref: {} });
      (getDownloadURL as any).mockResolvedValue(mockUrl);

      const result = await uploadImage(mockFile, mockPath);

      expect(ref).toHaveBeenCalled();
      expect(uploadBytes).toHaveBeenCalled();
      expect(result).toBe(mockUrl);
    });

    it('should throw StorageUploadError on failure', async () => {
      const mockFile = new File([''], 'test.png', { type: 'image/png' });
      (uploadBytes as any).mockRejectedValue(new Error('Upload failed'));

      await expect(uploadImage(mockFile, 'path')).rejects.toThrow('Failed to upload image');
    });
  });

  describe('getImageUrl', () => {
    it('should return download URL for a path', async () => {
      const mockUrl = 'https://firebasestorage.com/img1';
      (getDownloadURL as any).mockResolvedValue(mockUrl);

      const result = await getImageUrl('path');

      expect(result).toBe(mockUrl);
      expect(getDownloadURL).toHaveBeenCalled();
    });

    it('should throw StorageRetrievalError on failure', async () => {
      (getDownloadURL as any).mockRejectedValue(new Error('Not found'));

      await expect(getImageUrl('path')).rejects.toThrow('Failed to get image URL');
    });
  });

  describe('listImages', () => {
    it('should return an array of download URLs', async () => {
      const mockItems = [{ ref: 'ref1' }, { ref: 'ref2' }];
      (listAll as any).mockResolvedValue({ items: mockItems });
      (getDownloadURL as any).mockResolvedValueOnce('url1').mockResolvedValueOnce('url2');

      const result = await listImages('prefix');

      expect(result).toEqual(['url1', 'url2']);
      expect(listAll).toHaveBeenCalled();
      expect(getDownloadURL).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteImage', () => {
    it('should delete an image at the specified path', async () => {
      (deleteObject as any).mockResolvedValue(undefined);

      await deleteImage('path');

      expect(deleteObject).toHaveBeenCalled();
    });

    it('should throw StorageDeletionError on failure', async () => {
      (deleteObject as any).mockRejectedValue(new Error('Delete failed'));

      await expect(deleteImage('path')).rejects.toThrow('Failed to delete image');
    });
  });
});
