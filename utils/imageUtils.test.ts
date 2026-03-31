import { compressImage } from './imageUtils';

describe('imageUtils: compressImage', () => {
  it('should be defined', () => {
    expect(compressImage).toBeDefined();
  });

  // Note: Detailed testing of compressImage requires a browser-like environment (jsdom/canvas)
  // because it relies on FileReader, HTMLImageElement, and HTMLCanvasElement.
  it('should return a promise', () => {
    const mockFile = new Blob(['mock-data'], { type: 'image/png' }) as any;
    const promise = compressImage(mockFile);
    expect(promise).toBeInstanceOf(Promise);
  });
});
