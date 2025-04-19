"use client";

import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";
import { createRealtimeConnection } from "./lib/realtimeConnection";
import allAgentSets from "@/app/agentConfigs";
import Transcript from "./components/Transcript";
import EndSessionForm from "./components/EndSessionForm";
import { AgentConfig } from "@/app/types";

function App() {
  const [sessionStatus, setSessionStatus] = useState("DISCONNECTED");
  const [selectedAgentName, setSelectedAgentName] = useState("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);
  const [timer, setTimer] = useState(180);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sessionCount, setSessionCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const count = localStorage.getItem("voicemate_sessions") || "0";
      return parseInt(count, 10);
    }
    return 0;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const [userText, setUserText] = useState("");
  const { addTranscriptMessage } = useTranscript();
  const { logClientEvent } = useEvent();

  const sendClientEvent = (eventObj: any) => {
    if (dcRef.current?.readyState === "open") {
      logClientEvent(eventObj);
      dcRef.current.send(JSON.stringify(eventObj));
    }
  };

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
  });

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    if (sessionCount >= 2) {
      setShowShareModal(true);
      return;
    }
    setSessionStatus("CONNECTING");

    try {
      const res = await fetch("/api/session");
      const { client_secret } = await res.json();
      if (!client_secret?.value) return setSessionStatus("DISCONNECTED");

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
      }
      audioElementRef.current.autoplay = true;

      const { pc, dc } = await createRealtimeConnection(client_secret.value, audioElementRef);
      pcRef.current = pc;
      dcRef.current = dc;
      dc.addEventListener("message", e => handleServerEventRef.current(JSON.parse(e.data)));

      setSessionStatus("CONNECTED");
      updateSession(true);

      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            disconnectFromRealtime();
            setShowShareModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    pcRef.current?.getSenders().forEach(s => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    setSessionStatus("DISCONNECTED");
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);
    sendClientEvent({
      type: "conversation.item.create",
      item: { id, type: "message", role: "user", content: [{ type: "input_text", text }] },
    });
    sendClientEvent({ type: "response.create" });
  };

  const updateSession = (shouldTrigger = false) => {
    sendClientEvent({ type: "input_audio_buffer.clear" });
    sendClientEvent({
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: `Affect/personality: A cheerful guide.
Tone: Friendly, clear, and reassuring.
Pronunciation: Clear and conversational.`,
        voice: "sage",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
        },
        tools: [],
      },
    });

    if (shouldTrigger) {
      sendSimulatedUserMessage("Hey there, it’s great to have you here. Please enjoy three minutes of our amazing voice AI.");
      setTimeout(() => {
        sendSimulatedUserMessage("Still there? You can ask me anything — like help or just say hi.");
      }, 12000);
    }
  };

  useEffect(() => {
    const agents = allAgentSets.simpleExample;
    setSelectedAgentName(agents[0]?.name || "");
    setSelectedAgentConfigSet(agents);
  }, []);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") connectToRealtime();
  }, [selectedAgentName]);

  const onOrbClick = () => {
    sessionStatus === "DISCONNECTED" ? connectToRealtime() : disconnectFromRealtime();
  };

  const handleFormSuccess = () => {
    setShowShareModal(false);
    setTimer(180);
    const newCount = sessionCount + 1;
    setSessionCount(newCount);
    localStorage.setItem("voicemate_sessions", newCount.toString());
    connectToRealtime();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative">
      {/* Header */}
      <header className="flex flex-col items-center sm:flex-row sm:justify-between px-4 pt-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Image src="/voicemate.svg" alt="Logo" width={36} height={36} />
          <div>
            <h1 className="text-lg sm:text-xl font-bold">VoiceMate Pulse</h1>
            <p className="text-xs sm:text-sm text-gray-400">Tap the orb to experience Sage ✨</p>
          </div>
        </div>
        {sessionStatus === "CONNECTED" && (
          <div className="mt-2 sm:mt-0 text-sm">
            ⏳ {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
          </div>
        )}
      </header>

      {/* Orb */}
      <div className="flex flex-col items-center py-6">
        <motion.div
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-2xl cursor-pointer"
          animate={sessionStatus === "CONNECTED" ? { scale: [1,1.05,1], opacity: 1 } : { scale:1, opacity:0.4 }}
          transition={sessionStatus === "CONNECTED" ? { duration:1.2, repeat:Infinity } : { duration:0 }}
          onClick={onOrbClick}
        />
        <p className="text-xs text-gray-400 mt-2">
          {sessionStatus === "DISCONNECTED" && "🔌 Disconnected"}
          {sessionStatus === "CONNECTING"    && "⏳ Connecting..."}
          {sessionStatus === "CONNECTED"     && "🤔 Thinking..."}
        </p>
      </div>

      {/* Transcript & Input */}
      <div className="flex flex-1 flex-col overflow-hidden px-4">
        <div className="flex-1 overflow-y-auto flex flex-col-reverse">
          <Transcript userText={userText} setUserText={setUserText} onSendMessage={() => {}} canSend={false} />
        </div>
        {!showShareModal && (
          <div className="mt-2">
            <input
              type="text"
              value={userText}
              onChange={e => setUserText(e.target.value)}
              placeholder="Type a message..."
              className="w-full p-3 bg-gray-800 text-white placeholder-gray-400 rounded-lg border border-gray-600"
              onKeyDown={e => {
                if (e.key === "Enter" && userText.trim()) {
                  sendSimulatedUserMessage(userText.trim());
                  setUserText("");
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {showShareModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <EndSessionForm onSubmitSuccess={handleFormSuccess} />
        </div>
      )}
    </div>
);

export default App;
