import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      throw new Error(
        'GEMINI_API_KEY is not configured. Please set it in .env.local'
      );
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function getModel() {
  return getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
  });
}
