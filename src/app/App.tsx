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
import SharePulse from "./components/SharePulse";
import { AgentConfig } from "@/app/types";

function App() {
  const [sessionStatus, setSessionStatus] = useState("DISCONNECTED");
  const [selectedAgentName, setSelectedAgentName] = useState("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);
  const [timer, setTimer] = useState(180);
  const [showShareModal, setShowShareModal] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dcRef = useRef<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const [userText, setUserText] = useState("");
  const [transcriptWidth, setTranscriptWidth] = useState(400);

  const { addTranscriptMessage } = useTranscript();
  const { logClientEvent } = useEvent();

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      logClientEvent(eventObj, eventNameSuffix);
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
    setSessionStatus("CONNECTING");

    try {
      const tokenRes = await fetch("/api/session");
      const { client_secret } = await tokenRes.json();
      if (!client_secret?.value) return setSessionStatus("DISCONNECTED");

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
      }
      audioElementRef.current.autoplay = true;

      const { pc, dc } = await createRealtimeConnection(client_secret.value, audioElementRef);
      pcRef.current = pc;
      dcRef.current = dc;
      dc.addEventListener("message", (e) => handleServerEventRef.current(JSON.parse(e.data)));

      setSessionStatus("CONNECTED");
      updateSession(true);

      timerRef.current = setInterval(() => {
        setTimer((prev) => {
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
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => s.track?.stop());
      pcRef.current.close();
    }
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
        instructions: "You are Sage — a warm, expressive assistant who speaks clearly, confidently, and emotionally like a wise older sister.",
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
      sendSimulatedUserMessage("Hey there, show me the magic.");
    }
  };

  useEffect(() => {
    const agents = allAgentSets["simpleExample"];
    setSelectedAgentName(agents[0]?.name || "");
    setSelectedAgentConfigSet(agents);
  }, []);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  const onOrbClick = () => {
    if (sessionStatus === "DISCONNECTED") connectToRealtime();
    else disconnectFromRealtime();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex justify-between items-center px-4 pt-4">
        <div className="flex items-center gap-3">
          <Image src="/voicemate.svg" alt="VoiceMate Logo" width={40} height={40} />
          <div>
            <h1 className="text-xl font-bold">VoiceMate Pulse</h1>
            <p className="text-sm text-gray-400">Tap the orb to experience Sage ✨</p>
          </div>
        </div>
        {sessionStatus === "CONNECTED" && (
          <div className="text-sm font-medium">
            ⏳ {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
          </div>
        )}
      </header>

      <div className="flex justify-center items-center flex-col py-6">
        <motion.div
          className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-2xl cursor-pointer"
          animate={
            sessionStatus === "CONNECTED"
              ? { scale: [1, 1.05, 1], opacity: 1 }
              : { scale: 1, opacity: 0.4 }
          }
          transition={
            sessionStatus === "CONNECTED"
              ? { duration: 1.2, repeat: Infinity }
              : { duration: 0 }
          }
          onClick={onOrbClick}
        />
        <p className="text-sm text-gray-400 mt-2">
          {sessionStatus === "DISCONNECTED" && "🔌 Disconnected"}
          {sessionStatus === "CONNECTING" && "⏳ Connecting..."}
          {sessionStatus === "CONNECTED" && "🤔 Thinking..."}
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Transcript
          userText={userText}
          setUserText={setUserText}
          onSendMessage={() => {}}
          canSend={false}
          transcriptWidth={transcriptWidth}
          setTranscriptWidth={setTranscriptWidth}
        />
      </div>

      <SharePulse open={showShareModal} onClose={() => setShowShareModal(false)} />
    </div>
  );
}

export default App;
