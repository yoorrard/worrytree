
import { GoogleGenAI } from "@google/genai";

// Ensure API_KEY is available in the environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });

export const generateComfortingMessage = async (worryText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `사용자가 다음 내용에 대해 걱정하고 있습니다: "${worryText}". 이 걱정에 대해 짧고, 부드럽고, 따뜻한 위로의 메시지를 한국어로 작성해주세요. 1~2문장으로 간결하게 작성해주세요. 현명하고 친절한 친구처럼 직접 이야기하는 어조로 작성해주세요.`,
      config: {
        temperature: 0.8,
        topP: 1,
        topK: 32,
        maxOutputTokens: 150,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating comforting message:", error);
    // Provide a gentle and universal fallback message in case of an API error
    return "괜찮아요, 모든 것이 잘 될 거예요. 당신은 혼자가 아니에요.";
  }
};
