
import { GoogleGenAI } from "@google/genai";

// Base instruction defining the persona
const BASE_SYSTEM_INSTRUCTION = `You are the AI Assistant for "PR-CONNEXION", the Cluster Congo Entreprise Développement (CGED) platform.
Your role is to help users by providing accurate information based strictly on the "CURRENT PLATFORM DATA" provided to you.

GUIDELINES:
1. **Be Short and Precise**: Give direct answers. Avoid long paragraphs unless asked for a detailed explanation.
2. **Use Provided Data**: You have access to the list of members, their stats, locations, trainings, and activities. Use this data to answer specific questions (e.g., "Who lives in Kinshasa?", "What is Marie's progress?").
3. **No Hallucination**: If the data is not in the context, say you don't know.
4. **Tone**: Professional, encouraging, and helpful.
5. **Language**: Respond in French.
6. **Capabilities**:
   - Locate members (City/Address).
   - Check training progress and completion.
   - Summarize business sectors and activities.
   - Explain Cluster missions.

CONTEXT KEY:
- "CA": Chiffre d'Affaires (Revenue).
- "Capital": Capital.
- "Progress": Training completion percentage.
`;

// Fix: Always create a new GoogleGenAI instance right before making an API call for best practice
export const sendMessageToGemini = async (
  message: string,
  history: any[] = [],
  appContext: string = ''
) => {
  // Fix: MUST use named parameter for apiKey and direct usage of process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Fix: Using gemini-2.5-flash which supports both Google Maps and Search tools
  // Note: Maps grounding is only supported in Gemini 2.5 series models.
  const modelId = "gemini-2.5-flash";

  const tools = [
    { googleSearch: {} },
    { googleMaps: {} }
  ];

  // Combine static rules with dynamic data
  const fullSystemInstruction = `${BASE_SYSTEM_INSTRUCTION}\n\n=== CURRENT PLATFORM DATA ===\n${appContext}`;

  try {
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: fullSystemInstruction,
        tools: tools,
        thinkingConfig: { thinkingBudget: 1024 }
      },
      history: history
    });

    // Fix: chat.sendMessage only accepts the message parameter
    const result = await chat.sendMessage({ message });
    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
