
import { GoogleGenAI, Chat, Schema } from "@google/genai";
import { BASE_SYSTEM_INSTRUCTION } from '../constants';
import { logTokenUsage } from './dbService';
import { verifyJWT } from './securityService';

let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
let currentInstruction: string = BASE_SYSTEM_INSTRUCTION;

// Helper to identify user from token or context
const getCurrentUserId = (): string => {
    const token = localStorage.getItem('astro_token');
    if (token) {
        return verifyJWT(token) || 'anonymous';
    }
    return 'anonymous';
};

const trackUsageToDb = (prompt: string, response: string, feature: 'chat' | 'horoscope' = 'chat') => {
    // Estimate tokens: 1 token ~= 4 chars (Rough Estimate)
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(response.length / 4);
    
    // Log directly to Supabase via dbService
    const userId = getCurrentUserId();
    logTokenUsage(userId, feature, inputTokens, outputTokens);
};

const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.warn("API_KEY missing.");
      return null;
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const initializeChat = async (customInstruction?: string): Promise<Chat | null> => {
  const client = getAI();
  if (!client) return null;
  
  if (customInstruction) {
    currentInstruction = customInstruction;
  }

  try {
      chatSession = client.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: currentInstruction,
          temperature: 0.7,
          maxOutputTokens: 8192, 
        }
      });
      return chatSession;
  } catch (e) {
      console.warn("Failed to create chat session.", e);
      chatSession = null;
      return null;
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sendMessageToGemini = async (message: string, isPremium: boolean = false): Promise<string> => {
  if (!chatSession) {
      await initializeChat();
      if (!chatSession) {
          return "I am currently meditating in the cosmic void. Please check your connection or API key configuration.";
      }
  }

  const maxRetries = 2;
  let attempt = 0;

  let apiPrompt = message;
  if (isPremium) {
     apiPrompt = `${message} 
     
     [PREMIUM REQUEST]: Provide a rich, detailed 'Deep Dive' section. Include specific planetary alignments, Dasha implications, and concrete remedies. Be precise and avoid vague spiritual platitudes. Focus on actionable astrological data.`;
  }

  while (attempt < maxRetries) {
    try {
      if (!chatSession) throw new Error("Session lost");
      
      const result = await chatSession.sendMessage({
        message: apiPrompt
      });
      
      const responseText = result.text;
      if (!responseText) throw new Error("Empty response");
      
      // Log DB Usage
      trackUsageToDb(apiPrompt, responseText, 'chat');
      
      return responseText;
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      const isQuotaError = error?.status === 429 || error?.code === 429 || error?.message?.includes('quota');
      if (isQuotaError) {
        attempt++;
        if (attempt < maxRetries) {
            await delay(Math.pow(2, attempt) * 1000);
            continue;
        }
      }
      
      return "The stars are clouded by interference. Please try again in a moment.";
    }
  }
  return "The stars are clouded by interference. Please try again in a moment.";
};

export const generateJsonContent = async (prompt: string, maxTokens: number = 4000, schema?: Schema): Promise<any> => {
    const client = getAI();
    if (!client) return null;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                maxOutputTokens: maxTokens
            }
        });
        
        let text = response.text;
        if (!text) return null;
        
        trackUsageToDb(prompt, text, 'horoscope');
        
        if (text.trim().startsWith('```')) {
            text = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
        }

        try {
            return JSON.parse(text);
        } catch (parseError) {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            try { return JSON.parse(cleanText); } catch (e2) { return null; }
        }
    } catch (e) {
        console.error("JSON Generation Error:", e);
        return null;
    }
};
