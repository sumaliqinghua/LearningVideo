import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set the API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes audio clip to generate study notes.
 * @param base64Audio The audio clip in base64 format (WAV)
 * @param userPrompt The instruction prompt for the model
 */
export const analyzeAudio = async (base64Audio: string, userPrompt: string): Promise<string> => {
  try {
    const ai = getClient();
    
    // Fallback prompt if empty
    const promptToUse = userPrompt.trim() || `
      You are an expert technical tutor. I have just watched the last 2 minutes of a tutorial video.
      The attached audio is from that segment.
      
      Please perform the following tasks:
      1. **Transcript**: Provide a clean, accurate transcription of the speech.
      2. **Key Knowledge Points**: Summarize the technical concepts, commands, or logic discussed.
      3. **Summary**: A one-sentence takeaway.
      
      Format the output in clear Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/wav',
              data: base64Audio,
            },
          },
          {
            text: promptToUse,
          },
        ],
      },
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating notes from audio. Please check your API key and network.";
  }
};