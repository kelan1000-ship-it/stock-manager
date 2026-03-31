import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function test() {
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      tools: [{ functionDeclarations: [{ name: "get_weather", description: "Get weather" }] }],
    }
  });

  const res1 = await chat.sendMessage({ message: "What is the weather?" });
  console.log("Res1:", JSON.stringify(res1.candidates[0].content.parts, null, 2));

  try {
    const toolResponses = [
      {
        functionResponse: {
          name: "get_weather",
          response: { weather: "sunny" }
        }
      }
    ];
    console.log("Trying naked array of parts");
    const res2 = await chat.sendMessage({ message: toolResponses });
    console.log("Res2:", res2.text);
  } catch (e) {
    console.error("Error 1:", e.message);
    try {
      const toolResponses = [
        {
          functionResponse: {
            name: "get_weather",
            response: { weather: "sunny" }
          }
        }
      ];
      console.log("Trying array of contents");
      const res3 = await chat.sendMessage({ message: [{ parts: toolResponses }] });
      console.log("Res3:", res3.text);
    } catch (e2) {
      console.error("Error 2:", e2.message);
      try {
        const toolResponses = [
          {
            functionResponse: {
              name: "get_weather",
              response: { weather: "sunny" }
            }
          }
        ];
        console.log("Trying direct content object");
        const res4 = await chat.sendMessage({ message: { role: 'user', parts: toolResponses } });
        console.log("Res4:", res4.text);
      } catch (e3) {
         console.error("Error 3:", e3.message);
      }
    }
  }
}
test();