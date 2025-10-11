import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateComfortingMessage(worryText: string): Promise<string> {
  try {
    const prompt = `다음 걱정에 대해 따뜻하고 위로가 되는 짧은 메시지를 한국어로 작성해줘: "${worryText}"`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "당신은 따뜻하고 공감 능력이 뛰어난 친구입니다. 한국어로 위로의 조언을 해줍니다. 답변은 100자 이내로 짧게 해주세요.",
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text response from Gemini API.");
    }
    return text.trim();
  } catch (error) {
    console.error("Error generating comforting message:", error);
    return "마음을 다독여줄 말을 찾지 못했어요. 하지만 당신은 혼자가 아니에요.";
  }
}
