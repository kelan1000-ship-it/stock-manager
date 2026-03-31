import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function list() {
  try {
    const response = await ai.models.list();
    for await (const model of response) {
      if (model.name.includes('imagen')) {
         console.log(model.name);
      }
    }
    console.log("Done checking imagen models");
  } catch(e) {
    console.error(e.message);
  }
}

list();