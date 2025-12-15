// @ts-ignore
import { GoogleGenAI } from "@google/genai";

export const generatePlanetInfo = async (planetName: string, query?: string): Promise<string> => {
  // Lấy API Key từ môi trường
  const apiKey = process.env.API_KEY;
  
  // Kiểm tra nhanh, nếu không có key thì báo lỗi nhẹ nhàng
  if (!apiKey) {
    console.warn("Chưa cấu hình Gemini API Key.");
    return "API Key missing. Please check configuration.";
  }

  // Khởi tạo AI
  const ai = new GoogleGenAI({ apiKey });

  // Tạo câu hỏi (Prompt)
  const prompt = query 
    ? `Briefly answer this question about ${planetName} in the context of astronomy: ${query}`
    : `Tell me 3 interesting scientific facts about the planet ${planetName}. Keep it concise (under 50 words).`;

  try {
    // Gọi model để lấy nội dung
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No info available.";
  } catch (error) {
    console.error("Lỗi khi gọi Gemini API:", error);
    return "Could not retrieve information at this time.";
  }
};