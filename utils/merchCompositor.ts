
/**
 * Utility to programmatically compose a shelf image with product overlays.
 * Ensures pixel integrity by using actual source product images.
 */

export interface CompositorItem {
    imageUrl: string;
    slotId: number;
    row: number;
    col: number;
}

/**
 * Creates a base64 composite image of products on a shelf.
 */
export const createShelfComposite = async (
    shelfImageUrl: string | null,
    items: CompositorItem[],
    rows: number,
    cols: number,
    gapSlotIds: number[] = [],
    shelfEndSlotIds: number[] = []
): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not create canvas context");

    // Standardize canvas size
    canvas.width = 1536;
    canvas.height = 2048; // 3:4 aspect ratio

    // 1. Load and Draw Shelf Background
    try {
        const shelfImg = await loadResilientImage(
            shelfImageUrl || "https://images.unsplash.com/photo-1587854236841-382a39281a8b?q=80&w=2000&auto=format&fit=crop"
        );
        ctx.drawImage(shelfImg, 0, 0, canvas.width, canvas.height);
    } catch (e) {
        console.warn("[Compositor] Could not load shelf image, using solid background", e);
        ctx.fillStyle = "#f8fafc"; // Slate-50 background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw some simple "shelves" so the AI has something to work with
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 10;
        const shelfHeight = canvas.height * 0.8;
        const cellHeight = shelfHeight / rows;
        for (let i = 0; i <= rows; i++) {
            const y = (canvas.height * 0.1) + (i * cellHeight);
            ctx.beginPath();
            ctx.moveTo(canvas.width * 0.05, y);
            ctx.lineTo(canvas.width * 0.95, y);
            ctx.stroke();
        }
    }

    // 2. Define Grid Geometry
    const marginX = canvas.width * 0.1;
    const marginY = canvas.height * 0.1;
    const shelfWidth = canvas.width * 0.8;
    const shelfHeight = canvas.height * 0.8;

    const cellWidth = shelfWidth / cols;
    const cellHeight = shelfHeight / rows;

    // 3. Draw gap and shelf end indicators
    const drawIndicator = (id: number, color: string, label: string) => {
        const r = Math.floor(id / cols);
        const c = id % cols;
        const x = marginX + (c * cellWidth);
        const y = marginY + (r * cellHeight);

        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = color;
        ctx.fillRect(x + 5, y + 5, cellWidth - 10, cellHeight - 10);
        
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = color;
        ctx.font = "bold 24px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, x + cellWidth/2, y + cellHeight/2 + 8);
        ctx.restore();
    };

    for (const gapId of gapSlotIds) {
        drawIndicator(gapId, "#64748b", "GAP");
    }
    
    for (const endId of shelfEndSlotIds) {
        drawIndicator(endId, "#d97706", "END");
    }

    // 4. Draw Products
    for (const item of items) {
        try {
            const prodImg = await loadResilientImage(item.imageUrl);
            
            const x = marginX + (item.col * cellWidth) + (cellWidth * 0.1);
            const y = marginY + (item.row * cellHeight) + (cellHeight * 0.1);
            const w = cellWidth * 0.8;
            const h = cellHeight * 0.8;

            // sitting on the shelf
            const drawY = y + (h - (h * 0.85)); 

            ctx.drawImage(prodImg, x, drawY, w, h * 0.85);
            
            // tiny procedural shadow
            ctx.fillStyle = "rgba(0,0,0,0.08)";
            ctx.fillRect(x, drawY + (h * 0.82), w, h * 0.03);

        } catch (e) {
            console.warn(`[Compositor] Failed to load product image for slot ${item.slotId}`);
        }
    }

    return canvas.toDataURL('image/jpeg', 0.9);
};

/**
 * Loads an image with fallback logic for CORS and data URLs.
 */
const loadResilientImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const isDataUrl = url.startsWith('data:');
        
        if (!isDataUrl) {
            img.crossOrigin = "anonymous";
        }

        const timeout = setTimeout(() => {
            img.src = "";
            reject(new Error("Image load timeout"));
        }, 15000);

        img.onload = () => {
            clearTimeout(timeout);
            resolve(img);
        };

        img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error(`Failed to load image: ${url.substring(0, 50)}...`));
        };

        img.src = url;
    });
};

