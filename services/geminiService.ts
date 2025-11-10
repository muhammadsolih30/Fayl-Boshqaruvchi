
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
// FIX: The types `GenerateContentStreamResult`, `VideosOperation`, and `LiveSession` are not exported from `@google/genai`.
// `GenerateVideosOperationResponse` was a typo for the correctly exported `GenerateVideosOperation`.
import type { GenerateVideosOperation } from "@google/genai";

// FIX: Removed conflicting global declaration for `window.aistudio` to resolve type errors.
// The existing global type for `aistudio` will be used.

// FIX: Added type declarations for Vite's `import.meta.env` to resolve TypeScript errors.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_API_KEY?: string;
    };
  }
}

// Vite requires env variables to be prefixed with VITE_ and accessed via import.meta.env
const API_KEY = import.meta.env.VITE_API_KEY || '';

const getAiClient = () => new GoogleGenAI({ apiKey: API_KEY });

// Text & Chat
export const generateText = async (prompt: string, model: 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-flash-lite-latest' = 'gemini-2.5-flash', useThinking: boolean = false) => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: useThinking ? { thinkingConfig: { thinkingBudget: 32768 } } : {}
  });
  return response.text;
};

export const streamChat = async (history: { role: string, parts: { text: string }[] }[], newMessage: string) => {
  const ai = getAiClient();
  const chat = ai.chats.create({ 
      model: 'gemini-2.5-flash',
      history: history,
  });
  return await chat.sendMessageStream({ message: newMessage });
};

// Search & Maps Grounding
export const generateWithGrounding = async (prompt: string, tool: 'googleSearch' | 'googleMaps', location?: { latitude: number, longitude: number }) => {
    const ai = getAiClient();
    const config: any = { tools: [tool === 'googleSearch' ? {googleSearch: {}} : {googleMaps: {}}] };
    if (tool === 'googleMaps' && location) {
        config.toolConfig = { retrievalConfig: { latLng: location } };
    }
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config,
    });
    return response;
};

// Image Understanding & Editing
export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
  const ai = getAiClient();
  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: imageBase64,
    },
  };
  const textPart = { text: prompt };
  const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
  });
  return response.text;
};

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string | null> => {
  const ai = getAiClient();
  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mimeType,
    },
  };
  const textPart = { text: prompt };
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [imagePart, textPart] },
    config: { responseModalities: [Modality.IMAGE] },
  });
  
  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part && part.inlineData) {
    return part.inlineData.data;
  }
  return null;
};

// Image Generation
export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"): Promise<string | null> => {
  const ai = getAiClient();
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio,
    },
  });
  const base64ImageBytes = response.generatedImages[0]?.image.imageBytes;
  return base64ImageBytes || null;
};

// Video Generation
export const generateVideo = async (
  prompt: string,
  aspectRatio: "16:9" | "9:16",
  imageBase64?: string,
  mimeType?: string
): Promise<string | null> => {
  const hasKey = await window.aistudio.hasSelectedApiKey();
  if(!hasKey) {
      await window.aistudio.openSelectKey();
  }

  const ai = getAiClient();

  const requestPayload: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio,
    }
  };

  if (imageBase64 && mimeType) {
      requestPayload.image = { imageBytes: imageBase64, mimeType };
  }
  
  // FIX: Corrected the type from `GenerateVideosOperationResponse` to the exported `GenerateVideosOperation`.
  let operation: GenerateVideosOperation = await ai.models.generateVideos(requestPayload);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    try {
      operation = await ai.operations.getVideosOperation({ operation: operation });
    } catch (e: any) {
      if (e.message.includes("Requested entity was not found.")) {
        await window.aistudio.openSelectKey();
        throw new Error("API key might be invalid. Please select a valid key and try again.");
      }
      throw e;
    }
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (downloadLink) {
    const videoResponse = await fetch(`${downloadLink}&key=${API_KEY}`);
    const blob = await videoResponse.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return null;
};


// Live API
// FIX: Removed the return type annotation `Promise<LiveSession>` as `LiveSession` is not an exported type.
// The return type will be correctly inferred by TypeScript.
export const connectLive = (callbacks: {
    onopen: () => void;
    onmessage: (message: any) => Promise<void>;
    onerror: (e: any) => void;
    onclose: (e: any) => void;
}) => {
    const ai = getAiClient();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: 'You are a friendly and helpful assistant.',
        },
    });
};