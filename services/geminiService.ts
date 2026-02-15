
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedProductInfo, OrderHistoryEntry, OrderSuggestion, PlanogramLayout, Product, ShopFloor } from "../types";

/**
 * Extracts product information (barcode, name, pack size, price) from an image.
 */
export const extractProductInfoFromImage = async (base64Image: string, mimeType: string): Promise<ExtractedProductInfo> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        {
          text: 'Identify the product in this image. Extract barcode (EAN/UPC), name, pack size, and estimated retail price in GBP. Return as JSON.'
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          barcode: { type: Type.STRING },
          name: { type: Type.STRING },
          packSize: { type: Type.STRING },
          price: { type: Type.STRING },
          imageUrl: { type: Type.STRING },
        },
        required: ["barcode", "name", "packSize", "price"]
      }
    },
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return {};
  }
};

/**
 * Performs a Google-grounded search to find accurate product visuals and generates multiple options.
 */
export const searchAndGenerateOptions = async (productName: string, packSize: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const researchResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Search Google to find the visual description, branding colors, and packaging style of the retail pharmacy product: "${productName}" ${packSize}. Describe its appearance in detail for an image generation prompt.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const visualDescription = researchResponse.text || productName;

  const generationResponse = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: `A professional studio photograph of ${visualDescription}. Clear clinical branding, pack size ${packSize}, plain white background, high resolution 4k.`,
    config: {
      numberOfImages: 4,
      aspectRatio: '1:1',
      outputMimeType: 'image/jpeg'
    },
  });

  return generationResponse.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
};

/**
 * Generates an immersive AI visualization of a specific planogram layout.
 * Uses the Actual Shelf Image (realShelfImage) and product reference images as templates.
 */
export const visualizePlanogram = async (layout: PlanogramLayout, inventory: Product[]): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  
  const getBase64 = async (url: string): Promise<{ data: string; mimeType: string } | null> => {
    try {
        if (!url) return null;
        if (url.startsWith('data:')) {
            const parts = url.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            return { data: parts[1], mimeType: mime };
        }
        // Fetch image directly (requires CORS support or same-origin)
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                const parts = result.split(',');
                const mime = parts[0].match(/:(.*?);/)?.[1] || blob.type || 'image/jpeg';
                resolve({ data: parts[1], mimeType: mime });
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return null;
    }
  };

  const parts: any[] = [];
  const imageMap = new Map<string, number>();
  let imgCounter = 0;

  // 1. Structure Image
  let structureNote = "";
  if (layout.realShelfImage) {
      const imgInfo = await getBase64(layout.realShelfImage);
      if (imgInfo) {
          parts.push({ inlineData: { mimeType: imgInfo.mimeType, data: imgInfo.data } });
          imgCounter++;
          structureNote = `REFERENCE IMAGE 1 shows the ACTUAL PHYSICAL SHELF. Use its geometry, shelves, and lighting as the absolute base.`;
      }
  }

  // 2. Product Images & Slots
  const slotDescriptions = await Promise.all(layout.slots.map(async (slot, i) => {
      const p = inventory.find(x => x.id === slot.productId);
      if (!p) return `Slot ${i+1}: EMPTY (Leave this space blank)`;

      let refInfo = "";
      if (p.productImage) {
          if (!imageMap.has(p.id)) {
              const imgInfo = await getBase64(p.productImage);
              if (imgInfo) {
                  parts.push({ inlineData: { mimeType: imgInfo.mimeType, data: imgInfo.data } });
                  imgCounter++;
                  imageMap.set(p.id, imgCounter);
              }
          }
          if (imageMap.has(p.id)) {
              refInfo = ` [Use Product Appearance from IMAGE ${imageMap.get(p.id)}]`;
          }
      }
      return `Slot ${i+1} (Grid Pos ${i}): ${p.name} (${p.packSize})${refInfo}`;
  }));

  const prompt = `Act as an expert retail merchandiser and 3D visualizer.
    ${structureNote}
    
    TASK:
    Generate a photorealistic image of the shelf populated EXACTLY according to the planogram list below.
    
    STRICT CONSTRAINTS:
    1. ONLY use the stock explicitly listed in the slots. Do NOT hallucinate extra products, filler items, or decorations.
    2. If a slot is listed as 'EMPTY', that specific space on the shelf MUST remain empty (show the shelf background).
    3. Respect the grid layout. 'Slot 1' is top-left.
    4. For products with reference images, you MUST use that packaging style.
    5. AESTHETICS: Arrange the products neatly. "Face up" the products (align them to the front edge). Ensure professional spacing and presentation typical of a high-end pharmacy.
    
    PLANOGRAM LIST:
    ${slotDescriptions.join(', ')}
    
    OUTPUT:
    A hyper-realistic photograph of the merchandised shelf.`;

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: parts
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
        imageSize: "1K"
      }
    }
  });

  for (const candidate of response.candidates || []) {
    for (const part of candidate.content.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
};

/**
 * Generates an immersive 3D architectural render of the entire shop floor.
 * Maps placed shelves into a cinematic retail environment.
 */
export const visualizeShopFloor = async (floorPlan: ShopFloor, planograms: PlanogramLayout[]): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  
  const layoutDescription = floorPlan.items.map(item => {
    const p = planograms.find(plan => plan.id === item.planogramId);
    return `Shelf "${p?.name}" at position (${item.x}%, ${item.y}%) with dimensions ${item.width}% wide and ${item.depth}% deep, rotated ${item.rotation} degrees.`;
  }).join(' ');

  const prompt = `A professional architectural 3D rendering of a modern high-end pharmacy retail space. 
    The floor plan consists of the following shelf arrangement: ${layoutDescription}.
    The store has polished light gray concrete floors, clean white walls with subtle wood accents, and integrated LED ceiling panels providing soft, even illumination.
    The shelves are modern white metal modular units.
    Viewpoint: A wide-angle cinematic perspective from the entrance looking into the store, showing the spatial depth and arrangement.
    Hyper-realistic, 4K resolution, commercial interior design photography style.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    }
  });

  for (const candidate of response.candidates || []) {
    for (const part of candidate.content.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
};

/**
 * Generates a single realistic product image (Legacy support)
 */
export const generateProductImage = async (productName: string, packSize: string): Promise<string | null> => {
  const options = await searchAndGenerateOptions(productName, packSize);
  return options.length > 0 ? options[0] : null;
};

/**
 * Detects and extracts multiple products from a single image.
 */
export const extractMultipleProductsFromImage = async (base64Image: string, mimeType: string): Promise<ExtractedProductInfo[]> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        {
          text: 'Analyze this image and identify EVERY unique pharmacy/retail product visible. For each item, extract Name, Barcode (EAN-13/UPC), Pack Size, and estimated retail price in GBP. Return the result as a JSON array of objects.'
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            barcode: { type: Type.STRING },
            name: { type: Type.STRING },
            packSize: { type: Type.STRING },
            price: { type: Type.STRING },
          },
          required: ["name", "barcode", "packSize", "price"]
        }
      }
    },
  });

  try {
    const text = response.text || '[]';
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse multi-product Gemini response:", error);
    return [];
  }
};

/**
 * Specifically extracts a barcode from an image.
 */
export const extractBarcodeOnly = async (base64Image: string, mimeType: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        {
          text: 'Find the barcode number (EAN/UPC) in this image. Return ONLY the barcode digits or "NONE" if not found.'
        },
      ],
    },
  });

  const result = response.text?.trim();
  return (result === "NONE" || !result) ? null : result;
};

/**
 * AI Tool: Research Barcode (EAN) on UK websites using Google Search Grounding.
 */
export const researchBarcodeFromWeb = async (productName: string, packSize: string): Promise<{ barcode: string | null; sources: string[] }> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const prompt = `Find the retail Barcode (EAN-13) for the product: "${productName}" with pack size "${packSize}". Search UK retailers like Boots, Superdrug, or Tesco. Return the 13-digit number.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const urls = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];
  const text = response.text || '';
  const match = text.match(/\d{8,13}/);
  const barcode = match ? match[0] : null;

  return { 
    barcode, 
    sources: urls 
  };
};

/**
 * Research detailed product information based on name (for auto-filling form).
 */
export const researchProductDetails = async (productName: string): Promise<{ barcode?: string, productCode?: string, packSize?: string, supplier?: string, price?: number }> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const prompt = `Research the UK retail pharmacy product "${productName}". 
  Find its specific details:
  1. Barcode (EAN-13)
  2. PIP Code (UK Pharmacy Product Code)
  3. Pack Size (e.g. 30 tablets, 200ml)
  4. Likely UK Supplier (e.g. AAH, Alliance, Phoenix, Sigma, Enterprise)
  5. Estimated Retail Price (RRP) in GBP
  
  Return the result as a JSON object. If a field is not found, leave it empty.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          barcode: { type: Type.STRING },
          productCode: { type: Type.STRING },
          packSize: { type: Type.STRING },
          supplier: { type: Type.STRING },
          price: { type: Type.NUMBER },
        }
      }
    },
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return {};
  }
};

/**
 * Suggests order quantities based on history and stock.
 */
export const getOrderSuggestion = async (
  productName: string,
  history: OrderHistoryEntry[],
  currentStock: number,
  targetMonths: number
): Promise<OrderSuggestion> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze order history for "${productName}": ${JSON.stringify(history)}. Stock: ${currentStock}. Suggest order quantity for ${targetMonths} months buffer. Return JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedQuantity: { type: Type.INTEGER },
          reasoning: { type: Type.STRING },
        },
        required: ["suggestedQuantity", "reasoning"]
      }
    },
  });

  try {
    return JSON.parse(response.text || '{"suggestedQuantity": 0, "reasoning": "Error"}');
  } catch (error) {
    return { suggestedQuantity: 0, reasoning: "AI Error" };
  }
};
