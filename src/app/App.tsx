"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";
import { createRealtimeConnection } from "./lib/realtimeConnection";
import Transcript from "./components/Transcript";
import EndSessionForm from "./components/EndSessionForm";

function App() {
  const [sessionStatus, setSessionStatus] = useState("DISCONNECTED");
  const [timer, setTimer] = useState(180);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sessionCount, setSessionCount] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("voicemate_sessions") || "0", 10);
    }
    return 0;
  });

  const [userText, setUserText] = useState("");
  const { addTranscriptMessage } = useTranscript();
  const { logClientEvent } = useEvent();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  const sendClientEvent = (obj: any) => {
    if (dcRef.current?.readyState === "open") {
      logClientEvent(obj);
      dcRef.current.send(JSON.stringify(obj));
    }
  };

  const handleServerEventRef = useHandleServerEvent({
    sendClientEvent,
    setSessionStatus,
    selectedAgentName: "",
    selectedAgentConfigSet: null,
    setSelectedAgentName: () => {},
  });

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    if (sessionCount >= 2) return setShowShareModal(true);
    setSessionStatus("CONNECTING");
    try {
      const { client_secret } = await (await fetch("/api/session")).json();
      if (!client_secret?.value) throw new Error();
      if (!audioElemRef.current) audioElemRef.current = new Audio();
      audioElemRef.current.autoplay = true;
      const { pc, dc } = await createRealtimeConnection(client_secret.value, audioElemRef);
      pcRef.current = pc;
      dcRef.current = dc;
      dc.addEventListener("message", (e) => handleServerEventRef.current(JSON.parse(e.data)));
      setSessionStatus("CONNECTED");

      sendClientEvent({
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: `You're a friendly, helpful assistant. Engage proactively and speak clearly.`,
          voice: "sage",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 500,
            silence_duration_ms: 200,
            create_response: true,
          },
          tools: [],
        },
      });

      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            disconnectFromRealtime();
            setShowShareModal(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch {
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    setSessionStatus("DISCONNECTED");
  };

  const onOrbClick = () =>
    sessionStatus === "DISCONNECTED" ? connectToRealtime() : disconnectFromRealtime();

  const sendSimulatedUserMessage = (text: string) => {
    const id = typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 10);
    addTranscriptMessage(id, "user", text, true);
    sendClientEvent({ type: "conversation.item.create", item: { id, type: "message", role: "user", content: [{ type: "input_text", text }] } });
    sendClientEvent({ type: "response.create" });
    setUserText("");
  };

  const handleFormSuccess = () => {
    setShowShareModal(false);
    setTimer(180);
    const next = sessionCount + 1;
    setSessionCount(next);
    localStorage.setItem("voicemate_sessions", next.toString());
    connectToRealtime();
  };

  useEffect(() => {
    const start = async () => {
      await connectToRealtime();

      const waitForConnection = () =>
        new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            if (dcRef.current?.readyState === "open") {
              clearInterval(interval);
              resolve();
            }
          }, 100);
        });

      await waitForConnection();

      const intro = "Hey there, it’s great to have you here. I’m ready to help. What would you like to talk about?";
      const id = typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 10);

      addTranscriptMessage(id, "user", intro, true);

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: intro }],
        },
      });

      setTimeout(() => {
        sendClientEvent({ type: "response.create" });
      }, 1000);
    };

    start();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative pb-24">
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <Image src="/voicemate.svg" alt="Logo" width={36} height={36} />
          <div>
            <h1 className="text-xl font-bold">VoiceMate Pulse</h1>
            <p className="text-sm text-gray-400">Tap the orb to experience Sage ✨</p>
          </div>
        </div>
        {sessionStatus === "CONNECTED" && (
          <div className="mt-2 sm:mt-0 font-medium text-sm">
            ⏳ {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
          </div>
        )}
      </header>

      <div className="flex flex-col items-center py-6">
        <motion.div
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-2xl cursor-pointer"
          animate={sessionStatus === "CONNECTED" ? { scale: [1, 1.05, 1], opacity: 1 } : { scale: 1, opacity: 0.4 }}
          transition={sessionStatus === "CONNECTED" ? { duration: 1.2, repeat: Infinity } : { duration: 0 }}
          onClick={onOrbClick}
        />
        <p className="text-gray-400 text-sm mt-4 text-center w-full">
          {sessionStatus === "DISCONNECTED" && "🔌 Disconnected"}
          {sessionStatus === "CONNECTING" && "⏳ Connecting..."}
          {sessionStatus === "CONNECTED" && "🤔 Thinking..."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <Transcript />
      </div>

      {!showShareModal && (
        <div className="fixed bottom-0 left-0 w-full bg-black border-t border-gray-700 px-4 py-3 z-40">
          <input
            type="text"
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder="Type a message..."
            className="w-full rounded-full p-3 bg-gray-800 text-white placeholder-gray-400 border border-gray-600"
            onKeyDown={(e) => e.key === "Enter" && userText.trim() && sendSimulatedUserMessage(userText)}
          />
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
          <EndSessionForm onSubmitSuccess={handleFormSuccess} />
        </div>
      )}

      <style jsx global>{`
        .copy-button {
          background: linear-gradient(90deg, #6EE7B7, #3B82F6);
          color: white;
          border-radius: 9999px;
          padding: 0.5rem 1rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          border: none;
          cursor: pointer;
          transition: transform 0.15s ease-in-out;
        }
        .copy-button:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}

export default App;