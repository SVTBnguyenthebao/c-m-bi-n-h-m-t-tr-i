import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePlanetInfo = async (planetName: string, query?: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "API Key missing. Please configure your API key.";

  const prompt = query 
    ? `Briefly answer this question about ${planetName} in the context of astronomy: ${query}`
    : `Tell me 3 interesting scientific facts about the planet ${planetName}. Keep it concise (under 50 words).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No info available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not retrieve information at this time.";
  }
};
