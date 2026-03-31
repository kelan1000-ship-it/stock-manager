
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQqSLc-UcXHGv5pGX6iLpfmkDwexPLBPkrXaT18zqWknl-U_cdQ5YoM7R4ptLpgNry8Q/exec';

/**
 * Uploads an image (base64 or URL) to Google Drive via the Apps Script proxy.
 * Returns the final high-performance direct link (lh3.googleusercontent.com).
 */
export async function uploadToGoogleDrive(base64OrUrl: string, fileName: string): Promise<string> {
  const isDirectUrl = !base64OrUrl.includes('base64,') && base64OrUrl.startsWith('http');
  // If it's a URL, send the whole URL string. If it's base64, send just the data part.
  const dataToSend = isDirectUrl ? base64OrUrl : base64OrUrl.split(',')[1];

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ 
      base64: dataToSend, 
      productName: fileName,
      isUrl: isDirectUrl
    })
  });

  const result = await response.json();
  if (result.Error) throw new Error(result.Error);

  // Construct the high-performance direct link: lh3.googleusercontent.com/d/FILE_ID
  const finalUrl = result.fileId 
    ? `https://lh3.googleusercontent.com/d/${result.fileId}`
    : result.driveUrl || base64OrUrl;

  return finalUrl;
}
