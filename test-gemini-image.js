import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
        
        // We'll just create a dummy 1x1 webp base64 string to see if it rejects the mime type or schema
        const dummyWebpBase64 = "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/webp",
                    data: dummyWebpBase64,
                  },
                },
                {
                  text: 'Analyze this image and identify EVERY unique pharmacy/retail product visible. Return the result as a JSON array of objects.'
                },
              ],
            },
            config: {
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    barcode: { type: Type.STRING },
                    productCode: { type: Type.STRING },
                    name: { type: Type.STRING },
                    packSize: { type: Type.STRING },
                    price: { type: Type.STRING },
                  },
                  required: ["name", "barcode", "productCode", "packSize", "price"]
                }
              }
            },
          });
        console.log(response.text);
    } catch(e) {
        console.error("ERROR:");
        console.error(e.message);
    }
}

test();
