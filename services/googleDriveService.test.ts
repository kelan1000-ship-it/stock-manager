import { uploadToGoogleDrive } from './googleDriveService';

describe('googleDriveService', () => {
  it('should upload base64 image data correctly', async () => {
    // Note: Mocking fetch globally for this test
    const mockFetch = (globalThis.fetch as any) = (url: string, options: any) => {
      const body = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ fileId: 'mock-file-123' }),
      });
    };

    const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const result = await uploadToGoogleDrive(base64, 'test-product');

    expect(result).toBe(`https://lh3.googleusercontent.com/d/mock-file-123`);
  });

  it('should handle direct URL uploads correctly', async () => {
    (globalThis.fetch as any) = (url: string, options: any) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ driveUrl: 'https://drive.google.com/file/d/abc' }),
      });
    };

    const url = 'https://example.com/image.jpg';
    const result = await uploadToGoogleDrive(url, 'test-product');

    expect(result).toBe('https://drive.google.com/file/d/abc');
  });

  it('should throw an error if the API returns an error', async () => {
    (globalThis.fetch as any) = (url: string, options: any) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ Error: 'Upload failed' }),
      });
    };

    await expect(uploadToGoogleDrive('data:image/png;base64,xyz', 'test'))
      .rejects.toThrow('Upload failed');
  });
});
