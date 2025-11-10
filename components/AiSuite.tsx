import React, { useState, useRef, useEffect, useCallback } from "react";
// FIX: Removed import of non-exported types `GenerateContentStreamResult` and `LiveSession`.
import { Icon } from "./Icon";
import * as geminiService from "../services/geminiService";
import { useAppContext } from "../App";

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

// Helper functions for audio processing
function encode(bytes: Uint8Array) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
// FIX: Aligned audio decoding with Gemini API guidelines for handling raw PCM data.
// The function now accepts sampleRate and numChannels for better accuracy and flexibility.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const ChatBot: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!message) return;
    setIsLoading(true);
    const userMessage = { role: "user", parts: [{ text: message }] };
    const currentHistory = [...history, userMessage];
    setHistory(currentHistory);
    setMessage("");

    try {
      const stream = await geminiService.streamChat(history, message);
      let modelResponse = "";
      setHistory((prev) => [...prev, { role: "model", parts: [{ text: "" }] }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setHistory((prev) => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1] = {
            role: "model",
            parts: [{ text: modelResponse }],
          };
          return newHistory;
        });
      }
    } catch (e) {
      console.error(e);
      setHistory((prev) => [
        ...prev,
        { role: "model", parts: [{ text: `Xatolik: ${e}` }] },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    chatContainerRef.current?.scrollTo(
      0,
      chatContainerRef.current.scrollHeight
    );
  }, [history]);

  return (
    <div className="flex flex-col h-full">
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {history.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-lg p-3 rounded-lg ${
                msg.role === "user" ? "bg-accent text-white" : "bg-secondary"
              }`}
            >
              {msg.parts[0].text}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-secondary/50 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSend()}
          placeholder="Savol bering..."
          className="flex-1 p-2 border rounded-md bg-secondary"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !message}
          className="p-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:bg-muted"
        >
          <Icon name="send" />
        </button>
      </div>
    </div>
  );
};

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setImageUrl("");
    try {
      const imageBase64 = await geminiService.generateImage(
        prompt,
        aspectRatio
      );
      if (imageBase64) {
        setImageUrl(`data:image/jpeg;base64,${imageBase64}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Rasm yaratishda xatolik: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Masalan: Qizil skeytbord ushlab turgan robot"
          className="w-full h-24 p-2 border rounded-md bg-secondary mb-4"
        />
        <div className="flex gap-2 mb-4">
          {(["1:1", "16:9", "9:16", "4:3", "3:4"] as AspectRatio[]).map(
            (ar) => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`px-3 py-1 border rounded-md ${
                  aspectRatio === ar ? "bg-accent text-white" : "bg-secondary"
                }`}
              >
                {ar}
              </button>
            )
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt}
          className="w-full py-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:bg-muted"
        >
          {isLoading ? "Yaratilmoqda..." : "Yaratish"}
        </button>
      </div>
      <div className="mt-8 w-full max-w-2xl flex justify-center">
        {isLoading && (
          <div className="animate-pulse w-96 h-96 bg-secondary rounded-lg"></div>
        )}
        {imageUrl && (
          <img src={imageUrl} alt={prompt} className="rounded-lg shadow-lg" />
        )}
      </div>
    </div>
  );
};

const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [image, setImage] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        setImage({ base64: base64String, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt && !image) return;
    setIsLoading(true);
    setVideoUrl("");
    setError("");
    try {
      const url = await geminiService.generateVideo(
        prompt,
        aspectRatio,
        image?.base64,
        image?.mimeType
      );
      if (url) {
        setVideoUrl(url);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Video yaratishda xatolik yuz berdi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <p className="text-sm text-muted mb-4">
          Eslatma: Video yaratish bir necha daqiqa vaqt olishi mumkin.{" "}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            Narxlar haqida ma'lumot.
          </a>
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Masalan: Tezlikda ketayotgan mushukning neon gologrammasi"
          className="w-full h-24 p-2 border rounded-md bg-secondary mb-4"
        />
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-sm font-medium mr-2">
              Boshlang'ich rasm (ixtiyoriy):
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(["16:9", "9:16"] as const).map((ar) => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`px-3 py-1 border rounded-md ${
                  aspectRatio === ar ? "bg-accent text-white" : "bg-secondary"
                }`}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>
        {image && (
          <img
            src={`data:${image.mimeType};base64,${image.base64}`}
            className="max-h-32 rounded mb-4"
            alt="Uploaded preview"
          />
        )}
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full py-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:bg-muted"
        >
          {isLoading ? "Yaratilmoqda..." : "Video Yaratish"}
        </button>
      </div>
      <div className="mt-8 w-full max-w-2xl flex justify-center">
        {isLoading && (
          <div className="text-center">
            Video yaratilmoqda, iltimos kuting...{" "}
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mt-4"></div>
          </div>
        )}
        {error && <p className="text-red-500">{error}</p>}
        {videoUrl && (
          <video
            src={videoUrl}
            controls
            autoPlay
            className="rounded-lg shadow-lg"
          />
        )}
      </div>
    </div>
  );
};

const LiveConversation: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<
    { user: string; model: string }[]
  >([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentOutput, setCurrentOutput] = useState("");

  // FIX: Updated ref type to use `ReturnType` on the service function, as `LiveSession` is not an exported type.
  const sessionPromiseRef = useRef<ReturnType<
    typeof geminiService.connectLive
  > | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const inputAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputAudioContext;

      outputAudioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      sessionPromiseRef.current = geminiService.connectLive({
        onopen: () => {
          console.log("Live session opened");
          const source = inputAudioContext.createMediaStreamSource(stream);
          mediaStreamSourceRef.current = source;
          const scriptProcessor = inputAudioContext.createScriptProcessor(
            4096,
            1,
            1
          );
          scriptProcessorRef.current = scriptProcessor;

          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            const inputData =
              audioProcessingEvent.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const pcmBlob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: "audio/pcm;rate=16000",
            };

            sessionPromiseRef.current?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.destination);
        },
        onmessage: async (message) => {
          if (message.serverContent?.outputTranscription) {
            setCurrentOutput(
              (prev) => prev + message.serverContent.outputTranscription.text
            );
          }
          if (message.serverContent?.inputTranscription) {
            setCurrentInput(
              (prev) => prev + message.serverContent.inputTranscription.text
            );
          }
          if (message.serverContent?.turnComplete) {
            setTranscripts((prev) => [
              ...prev,
              { user: currentInput, model: currentOutput },
            ]);
            setCurrentInput("");
            setCurrentOutput("");
          }

          const audioData =
            message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData && outputAudioContextRef.current) {
            const outCtx = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(
              nextStartTimeRef.current,
              outCtx.currentTime
            );
            // FIX: Passing sampleRate and numChannels to the updated decodeAudioData function.
            const audioBuffer = await decodeAudioData(
              decode(audioData),
              outCtx,
              24000,
              1
            );
            const source = outCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outCtx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
          }
        },
        onerror: (e) => console.error("Live error:", e),
        onclose: () => console.log("Live session closed"),
      });
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Mikrofonga ruxsat berilmadi yoki xatolik yuz berdi.");
    }
  };

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
      sessionPromiseRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      await audioContextRef.current.close();
    }
    if (
      outputAudioContextRef.current &&
      outputAudioContextRef.current.state !== "closed"
    ) {
      await outputAudioContextRef.current.close();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 md:p-8 flex flex-col h-full items-center">
      <div className="w-full max-w-2xl flex-1 flex flex-col">
        <div className="bg-secondary p-4 rounded-lg flex-1 overflow-y-auto mb-4">
          {transcripts.map((t, i) => (
            <div key={i} className="mb-2">
              <p>
                <strong className="text-accent">Siz:</strong> {t.user}
              </p>
              <p>
                <strong>Model:</strong> {t.model}
              </p>
            </div>
          ))}
          {currentInput && (
            <p>
              <strong className="text-accent">Siz:</strong> {currentInput}
            </p>
          )}
          {currentOutput && (
            <p>
              <strong>Model:</strong> {currentOutput}
            </p>
          )}
        </div>
        <div className="flex justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-4 rounded-full text-white ${
              isRecording ? "bg-red-500" : "bg-green-500"
            }`}
          >
            <Icon
              name={isRecording ? "stop" : "microphone"}
              className="w-8 h-8"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export const AiSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState("chat");

  const tabs = {
    chat: { label: "Chat", component: <ChatBot /> },
    image: { label: "Rasm Yaratish", component: <ImageGenerator /> },
    video: { label: "Video Yaratish", component: <VideoGenerator /> },
    live: { label: "Jonli Suhbat", component: <LiveConversation /> },
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-secondary/50">
        {Object.entries(tabs).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`py-2 px-4 ${
              activeTab === key
                ? "border-b-2 border-accent text-accent"
                : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tabs[activeTab as keyof typeof tabs].component}
      </div>
    </div>
  );
};
