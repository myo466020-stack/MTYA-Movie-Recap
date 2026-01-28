
import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export async function transcribeMedia(file: File): Promise<string> {
  try {
    const mediaPart = await fileToGenerativePart(file);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          mediaPart,
          { text: "Provide a detailed, verbatim transcript of the audio in this file. Do not add any extra commentary, just the spoken words." }
        ]
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Transcription failed: No text in response.");
    }
    return text.trim();
  } catch (error) {
    console.error("Error transcribing media:", error);
    throw new Error("Could not transcribe the file. The format may not be supported or the file may be corrupt.");
  }
}

export async function generateRecapScript(transcript: string, language: string): Promise<{ script: string; title: string }> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: transcript,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: {
              type: Type.STRING,
              description: `An engaging movie recap script in the ${language} language.`,
            },
            title: {
              type: Type.STRING,
              description: `A catchy YouTube title for the recap in the ${language} language.`,
            },
          },
          required: ['script', 'title'],
        },
        systemInstruction: `You are an expert movie recap writer and YouTube content strategist. Your task is to process the provided movie transcript and generate two things in a single JSON object:
    1. 'script': An exciting and engaging movie recap script in the ${language} language. Use a storytelling tone. This is for an audio recap, so do not mention 'video'.
    2. 'title': A catchy, clickbait-style YouTube title for the recap, also in ${language}.

    Your response MUST be a valid JSON object with the keys "script" and "title".`,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Failed to generate script: No text in response.");
    }
    const result = JSON.parse(text);
    return result;
  } catch (error) {
    console.error("Error generating recap script:", error);
    throw new Error("Could not generate recap script from the provided transcript.");
  }
}

export async function generateAudio(script: string, voiceName: string = 'Puck'): Promise<string> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Failed to generate audio: No audio data in response.");
    }
    return base64Audio;
  } catch (error) {
    console.error("Error generating audio:", error);
    throw new Error("Could not generate audio from the provided script.");
  }
}
