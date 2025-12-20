import OpenAI from "openai";

let TEXT_MODEL = process.env.QINIU_TEXT_MODEL || "deepseek-v3";
const DEFAULT_BASE_URL = process.env.QINIU_API_BASE_URL || "https://api.qnaigc.com/v1";

const getClient = () => {
  const apiKey = process.env.QINIU_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("QINIU_API_KEY is missing from environment variables");
  }
  return new OpenAI({
    apiKey,
    baseURL: DEFAULT_BASE_URL,
    dangerouslyAllowBrowser: true
  });
};

export const setTextModel = (model: string) => {
  TEXT_MODEL = model || TEXT_MODEL;
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

    // Use OpenAI chat completions with audio input
    const response = await ai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: {
                data: base64Audio,
                format: "wav"
              }
            },
            {
              type: "text",
              text: promptToUse
            }
          ]
        }
      ],
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || "No analysis generated.";
  } catch (error) {
    console.error("Qiniu API Error:", error);
    return "Error generating notes from audio. Please check your API key and network.";
  }
};

/**
 * Analyzes subtitle text to generate study notes.
 * @param subtitleText The subtitle transcript text
 * @param userPrompt The instruction prompt for the model
 */
export const analyzeText = async (subtitleText: string, userPrompt: string): Promise<string> => {
  try {
    const ai = getClient();
    
    // Fallback prompt if empty
    const promptToUse = userPrompt.trim() || `
      You are an expert technical tutor. I have just watched a segment of a tutorial video.
      
      Please perform the following tasks based on the transcript:
      1. **Key Knowledge Points**: Summarize the technical concepts, commands, or logic discussed.
      2. **Summary**: A one-sentence takeaway.
      
      Format the output in clear Markdown.
    `;

    const fullPrompt = `${promptToUse}\n\n**Transcript:**\n${subtitleText}`;

    const response = await ai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || "No analysis generated.";
  } catch (error) {
    console.error("Qiniu API Error:", error);
    return "Error generating notes from text. Please check your API key and network.";
  }
};

/**
 * Answers a user question based on context from subtitle text.
 * @param contextText The subtitle text around the current timestamp
 * @param question The user's question
 */
export const askQuestion = async (contextText: string, question: string): Promise<string> => {
  try {
    const ai = getClient();
    
    const systemPrompt = `你是一个视频教程助手。用户正在观看一个教程视频，并根据当前播放位置前后的内容向你提问。
请根据提供的字幕上下文来回答用户的问题。如果上下文中没有相关信息，请诚实地说明。
回答应该简洁、准确、有帮助。使用 Markdown 格式。`;

    const userMessage = `**视频字幕上下文（当前时间点前后2分钟）:**
${contextText}

**用户问题:**
${question}`;

    const response = await ai.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.5
    });

    return response.choices[0]?.message?.content || "无法生成回答。";
  } catch (error) {
    console.error("Qiniu API Error:", error);
    return "生成回答时出错，请检查 API 配置和网络连接。";
  }
};
