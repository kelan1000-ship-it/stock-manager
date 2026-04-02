
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedProductInfo, OrderHistoryEntry, OrderSuggestion, PlanogramLayout, PlanogramSlot, Product, ShopFloor } from "../types";

/**
 * Validates the presence of the Gemini API key and returns an AI client instance.
 */
const getAIClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("CRITICAL: Gemini API key is missing. AI Merchandiser and Assistant will be unavailable.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Extracts product information (barcode, name, pack size, price) from an image.
 */
export const extractProductInfoFromImage = async (base64Image: string, mimeType: string): Promise<ExtractedProductInfo> => {
  console.log(`[extractProductInfoFromImage] Sending request to Gemini...`);
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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

    console.log(`[extractProductInfoFromImage] Response received:`, response.text);
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to parse Gemini response or API error:", error);
    return {};
  }
};

/**
 * Performs a Google-grounded search to find accurate product visuals and generates multiple options.
 */
export const searchAndGenerateOptions = async (productName: string, packSize: string): Promise<string[]> => {
  try {
    const ai = getAIClient();
    const researchResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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

    return (generationResponse.generatedImages || []).map(img => {
      const imgData = (img.image as any)?.imageBytes || (img.image as any)?.bytes || (img as any).imageBytes || (img as any).bytes;
      return imgData ? `data:image/jpeg;base64,${imgData}` : '';
    }).filter(Boolean);
  } catch (error) {
    console.error("[searchAndGenerateOptions] Failed to generate options", error);
    return [];
  }
};

/**
 * Uses AI to suggest an optimized layout for a set of products.
 * Groups by category, brand, and size for best retail practice.
 */
export const optimizePlanogramLayout = async (
    products: Product[],
    rows: number,
    cols: number,
    gapSlotIds: number[] = [],
    shelfEndSlotIds: number[] = []
): Promise<{ productId: string, slotId: number }[]> => {
    try {
        const ai = getAIClient();
        const productList = products.map(p => `- ${p.name} (${p.packSize}), ID: ${p.id}`).join('\n');
        const availableSlots = (rows * cols) - gapSlotIds.length - shelfEndSlotIds.length;

        const gapInstruction = gapSlotIds.length > 0
            ? `\n        GAPS (physically unusable space — do NOT assign any products to these slot IDs): [${gapSlotIds.join(', ')}]\n`
            : '';
            
        const shelfEndInstruction = shelfEndSlotIds.length > 0
            ? `\n        SHELF ENDS (Indicates the physical end of a shelf where products are larger. Do NOT assign any products to these slot IDs, and use this logic to understand that packaging size limits capacity): [${shelfEndSlotIds.join(', ')}]\n`
            : '';

        const prompt = `You are an expert pharmacy merchandiser.

        TASK:
        Organize the following ${products.length} products into a grid of ${rows} rows and ${cols} columns (Total slots: ${rows * cols}).
        ${gapInstruction}${shelfEndInstruction}        Available slots: ${availableSlots} (out of ${rows * cols} total).

        RETAIL BEST PRACTICES:
        1. Group similar brands together.
        2. Group by category (e.g. pain relief, cough/cold).
        3. Place heavier/larger items on bottom shelves.
        4. Maintain a clean, logical flow (alphabetical or brand-centric).
        5. Where a shelf image is provided, clear the shelf space and add products correctly as per merchandising research.

        PRODUCTS:
        ${productList}

        OUTPUT:
        Return ONLY a JSON array of objects: [{"productId": "...", "slotId": 0}, ...].
        Ensure slotId is between 0 and ${rows * cols - 1}. Do NOT use any gap or shelf end slot IDs listed above.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text || '[]');
    } catch (error) {
        console.error("[optimizePlanogramLayout] Failed:", error);
        return [];
    }
};

/**
 * Generates an immersive AI visualization of a specific planogram layout.
 * Uses a hybrid approach:
 * 1. Takes a "Composite Base" (created via Canvas) as input context.
 * 2. Instructs AI to harmonize lighting and cast shadows.
 * 3. Instructs AI to "clean" the physical shelf background of old stock.
 */
export const visualizePlanogram = async (
    layout: PlanogramLayout, 
    inventory: Product[], 
    faceContext?: { slots: PlanogramSlot[], rows: number, cols: number },
    compositeBase?: string // New: The pixel-perfect composite base image
): Promise<string | null> => {
  const currentSlots = faceContext?.slots || layout.slots;
  const currentRows = faceContext?.rows || layout.rows;
  const currentCols = faceContext?.cols || layout.cols;

  console.log(`[visualizePlanogram] Generating high-fidelity render for: ${layout.name}`);

  try {
    const ai = getAIClient();
    const parts: any[] = [];

    // 1. Context Injection: The "Reality" Base
    if (compositeBase) {
        const base64Data = compositeBase.split(',')[1];
        parts.push({ 
            inlineData: { mimeType: 'image/jpeg', data: base64Data } 
        });
    }

    const slotDescriptions = currentSlots.map((slot, i) => {
        const p = inventory.find(x => x.id === slot.productId);
        return `Slot ${i+1}: ${p ? `${p.name} (Pack Size: ${p.packSize || 'Unknown'})` : 'EMPTY'}`;
    }).join(', ');

    const prompt = `Act as an expert retail merchandiser and commercial photographer.
      
      INPUT IMAGE:
      The provided image is a rough composite of a pharmacy shelf. It contains the ACTUAL products (medication boxes/bottles) positioned in their ${currentRows}x${currentCols} grid.
      
      CORE TASK:
      Generate a hyper-realistic, professional photograph of this merchandised shelf based ONLY on the provided composite.
      
      STRICT CONSTRAINTS:
      1. **PIXEL INTEGRITY & NO HALLUCINATION**: You MUST use only the images of the products provided in the composite. DO NOT hallucinate or create any other products, brands, or images on the shelf.
      2. **PACK SIZE ACCURACY**: Identify the pack size of the products to find the most accurate visual representation, but primarily use the exact images provided in the composite. Do NOT change the names or logos on the boxes.
      3. **DIMENSION & SCALE**: If an actual background shelf image is visible in the composite, use it to assess the correct physical dimensions, scale, and perspective of how the products should appear sitting on that specific shelf.
      4. **SHELF CLEANUP**: If there are any "original" products visible in the background shelf image that don't belong to the new planogram list, you MUST remove/erase them and replace them with the clean shelf background.
      5. **HARMONIZATION**: Add realistic global illumination, depth-of-field, and soft shadows beneath every product so they look physically integrated with the shelf.
      
      PLANOGRAM LIST (Verify all items are present):
      ${slotDescriptions}
      
      OUTPUT:
      Return a high-resolution, photorealistic rendering reflecting exactly the items in the composite.`;

    // Step 1: Use Gemini to build the technical prompt for refinement
    const textResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts: [...parts, { text: prompt }] }
    });

    const refinementPrompt = textResponse.text || prompt;

    // Step 2: Use Imagen 4 for the final render (Image-to-Image / Contextual Generation)
    const imageResponse = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: refinementPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '3:4',
        outputMimeType: 'image/jpeg'
      }
    });

    console.log(`[visualizePlanogram] Final Render Complete.`);

    if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
      const img = imageResponse.generatedImages[0];
      // Robust extraction: try every possible path for the bytes
      const imgData = (img.image as any)?.imageBytes || (img.image as any)?.bytes || (img as any).imageBytes || (img as any).bytes || (img.image as any)?.data;
      if (imgData) {
        return `data:image/jpeg;base64,${imgData}`;
      }
    }
    
    return compositeBase || null; // Fallback to composite if AI render fails
  } catch (error) {
    console.error("[visualizePlanogram] Inference failed:", error);
    return compositeBase || null;
  }
};

/**
 * Generates an immersive 3D architectural render of the entire shop floor.
 * Maps placed shelves into a cinematic retail environment.
 */
export const visualizeShopFloor = async (floorPlan: ShopFloor, planograms: PlanogramLayout[]): Promise<string | null> => {
  console.log(`[visualizeShopFloor] Generating store render...`);
  try {
    const ai = getAIClient();
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

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
        outputMimeType: 'image/jpeg'
      }
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const img = response.generatedImages[0];
      const imgData = (img.image as any)?.imageBytes || (img.image as any)?.bytes || (img as any).imageBytes || (img as any).bytes || (img.image as any)?.data;
      if (imgData) {
        return `data:image/jpeg;base64,${imgData}`;
      }
    }
    return null;
  } catch (error) {
    console.error("[visualizeShopFloor] Inference failed:", error);
    return null;
  }
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
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: 'Analyze this image and identify EVERY unique pharmacy/retail product visible. For each item, extract: Name, Barcode (EAN-13), PIP Code (if visible), Pack Size, and estimated retail price in GBP. Return as a JSON array of objects. IMPORTANT: Only return products you are highly confident in.'
          },
        ],
      },
      config: {
        maxOutputTokens: 4096, 
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
            required: ["name"]
          }
        }
      },
    });

    const text = response.text || '[]';
    console.log(`[extractMultipleProductsFromImage] Raw JSON:`, text);
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
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
  } catch (error) {
    console.error("[extractBarcodeOnly] Extraction failed", error);
    return null;
  }
};

/**
 * AI Tool: Research Barcode (EAN) on UK websites using Google Search Grounding.
 */
export const researchBarcodeFromWeb = async (
  productName: string,
  packSize: string,
  productCode?: string
): Promise<{ barcode: string | null; sources: string[] }> => {
  try {
    const ai = getAIClient();
    const pipContext = productCode ? ` The product's PIP Code is ${productCode} — use this to uniquely identify it.` : '';
    const prompt = `Find the retail Barcode (EAN-13) for the product: "${productName}" with pack size "${packSize}".${pipContext} Search UK retailers like Boots, Superdrug, or Tesco. Return the 13-digit number.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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
  } catch (error) {
    console.error("[researchBarcodeFromWeb] Web research failed", error);
    return { barcode: null, sources: [] };
  }
};

/**
 * Research detailed product information based on name (for auto-filling form).
 */
export const researchProductDetails = async (
  productName: string,
  context?: { barcode?: string; productCode?: string; packSize?: string; supplier?: string; price?: number }
): Promise<{ 
  barcode?: string | string[], 
  productCode?: string | string[], 
  packSize?: string | string[], 
  price?: number | number[] 
}> => {
  console.log(`[researchProductDetails] Researching product: ${productName}`, context ? `with context: ${JSON.stringify(context)}` : '');
  try {
    const ai = getAIClient();

    const contextLines: string[] = [];
    if (context?.productCode) contextLines.push(`- PIP Code (already known): ${context.productCode} — use this to verify and narrow the search`);
    if (context?.packSize)    contextLines.push(`- Pack Size (already known): ${context.packSize} — only return results matching this pack size`);
    if (context?.barcode)     contextLines.push(`- Barcode (already known): ${context.barcode} — confirm this is correct`);
    if (context?.supplier)    contextLines.push(`- Supplier (already known): ${context.supplier} — use to narrow down the specific product variation`);
    if (context?.price && context.price > 0) contextLines.push(`- Current Price: £${context.price.toFixed(2)} — use to verify the product identity`);
    
    const contextSection = contextLines.length > 0
      ? `\n\nKNOWN CONTEXT (already verified — do NOT suggest changes to these, use them to narrow your search):\n${contextLines.join('\n')}`
      : '';

    const prompt = `Research the UK retail pharmacy product "${productName}".${contextSection}
    Find its specific details:
    1. Barcode (EAN-13)
    2. PIP Code (UK Pharmacy Product Code)
    3. Pack Size (e.g. 30 tablets, 200ml)
    4. Estimated Retail Price (RRP) in GBP

    If you find multiple plausible options for any field (e.g. multiple barcodes for different pack sizes of the same name, or multiple PIP codes), return them as an array of values.
    
    Strictly return the result as a raw JSON object. Do not include markdown formatting. If a field is not found, leave it empty.
    Example format: {"barcode": ["123", "456"], "productCode": "...", "packSize": "...", "price": 0.00}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    console.log(`[researchProductDetails] Response received:`, response.text);
    
    const text = response.text || '{}';
    const stripped = text.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : '{}';
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("AI Research failed", e);
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
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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

    return JSON.parse(response.text || '{"suggestedQuantity": 0, "reasoning": "Error"}');
  } catch (error) {
    console.error("[getOrderSuggestion] suggestion failed", error);
    return { suggestedQuantity: 0, reasoning: "AI Error" };
  }
};

export const ASSISTANT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_inventory_stats",
        description: "Get summary statistics about the current inventory (slow movers, restocks needed, expiring items, etc).",
      },
      {
        name: "search_inventory",
        description: "Search for products in the current branch's inventory.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "The search term (name, barcode, or code)" },
          },
          required: ["query"],
        },
      },
      {
        name: "check_price_alerts",
        description: "Check if there are any pending price alerts or label updates required.",
      },
      {
        name: "get_restock_suggestions",
        description: "Get a list of items that are low on stock and need to be ordered.",
      },
      {
        name: "draft_transfer",
        description: "Draft a stock transfer request to send to another branch.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: "Name of the product to transfer" },
            quantity: { type: Type.NUMBER, description: "Quantity to transfer" },
            targetBranch: { type: Type.STRING, description: "Target branch (e.g., 'broom' or 'bywood')" },
          },
          required: ["productName", "quantity", "targetBranch"],
        },
      },
      {
        name: "send_branch_message",
        description: "Send a text message to the other branch.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "The content of the message" },
          },
          required: ["message"],
        },
      },
      {
        name: "generate_branch_snapshot",
        description: "Generate a comprehensive snapshot of the branch operations including inventory stats, today's EPOS summary, and pending requests."
      },
      {
        name: "get_pending_requests",
        description: "Get pending customer requests and orders for both branches."
      },
      {
        name: "clinical_inventory_search",
        description: "Search the inventory for multiple active ingredients or brand names simultaneously to find ALL possible treatment options for a clinical condition.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            keywords: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Array of keywords to search for (e.g., ['buscopan', 'hyoscine', 'peppermint', 'mebeverine'])" 
            },
          },
          required: ["keywords"],
        },
      }
    ],
  },
];

      export const createAssistantChatSession = (history: any[]) => {
  const ai = getAIClient();
  return ai.chats.create({
    model: 'gemini-2.0-flash',
    config: {
      tools: ASSISTANT_TOOLS,
      systemInstruction: `You are the Greenchem Pharmacy AI Operations Assistant and an expert UK Pharmacy Counter Assistant.
    Your goal is to help staff manage stock, analyze inventory performance, facilitate branch communication, and provide clinical recommendations based strictly on available inventory.

    CAPABILITIES:
    1. Inventory Analysis: Use get_inventory_stats and search_inventory to provide insights.
    2. Price Management: Check check_price_alerts to identify margin issues or required label updates.
    3. Logistics: Draft stock transfers between Broom Road and Bywood Ave using draft_transfer.
    4. Communication: Send messages to the other branch via send_branch_message.
    5. Branch Snapshot & EPOS: Use generate_branch_snapshot to check branch status and get_pending_requests for pending orders.
    6. Clinical Consultations (UK Pharmacy): When acting as a Counter Assistant (e.g., asked for "Counter advice for: X" or about treatments), you MUST perform a deep, exhaustive analysis before responding.
       - Step 1 (Mental Checklist): Analyze the condition against NHS/NICE CKS guidelines. Identify all relevant pharmacological pathways and active ingredients.
       - Step 2 (Tool Use): AUTONOMOUSLY call the 'clinical_inventory_search' tool with an array of ALL relevant active ingredients and common UK brand names for the condition.
       - Step 3 (Response Structure): Provide a highly structured consultation that includes:
         * 📚 NHS/NICE Clinical Overview
         * 🚨 Red Flags (When to refer to the pharmacist)
         * 💊 Available In-Stock Treatments (Grouped by action/ingredient, specifying exactly what we have based the tool results. Do NOT invent stock)
         * ❌ Out-of-Stock Alternatives (If a standard NHS treatment is NOT in stock, you MUST still discuss it, but clearly mark it as currently unavailable in the branch)
         * 🌿 Non-pharmacological / Lifestyle Advice
       Do NOT refuse to discuss a product or condition just because it is out of stock. Always answer the clinical question comprehensively while clarifying inventory status.
    7. Follow-up Suggestions: At the very end of EVERY single response, you MUST provide 2 to 3 relevant follow-up questions the user could ask. Format EACH question EXACTLY like this: <suggest>Your question here</suggest>

    TONE: Professional, structured, comprehensive, and clinical. Use markdown (headers, bolding, lists, emojis) to make the consultation easy to digest quickly.`,
    },
    history: history,
  });
};
