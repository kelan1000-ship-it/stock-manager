import { runAssistantChat } from './services/geminiService.js';

async function test() {
  try {
    const res = await runAssistantChat([], "Hello");
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
