import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'hello',
        });
        console.log(response.text);
    } catch(e) {
        console.error("ERROR:");
        console.error(e.message);
    }
}

test();
