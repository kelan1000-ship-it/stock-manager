
export const compressImage = (file: File, maxSize: number = 1920, quality: number = 0.95): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log(`[compressImage] Starting compression for ${file.name} (${file.size} bytes)`);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        console.log(`[compressImage] Original dimensions: ${width}x${height}`);

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        console.log(`[compressImage] Resizing to: ${width}x${height}`);

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('[compressImage] Canvas context failed');
          reject(new Error('Canvas rendering context failed'));
          return;
        }
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        console.log(`[compressImage] Compressed size: ${dataUrl.length} chars (approx ${Math.round(dataUrl.length * 0.75)} bytes)`);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        console.error('[compressImage] Image load error', err);
        reject(err);
      };
    };
    reader.onerror = (err) => {
      console.error('[compressImage] File read error', err);
      reject(err);
    };
  });
};
