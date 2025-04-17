"use client";

import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { motion } from "framer-motion";

import Transcript from "./components/Transcript";
import Events from "./components/Events";
import BottomToolbar from "./components/BottomToolbar";

import { AgentConfig, SessionStatus } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";
import { createRealtimeConnection } from "./lib/realtimeConnection";
import { allAgentSets } from "@/app/agentConfigs";

function App() {
  const [timer, setTimer] = useState<number>(180);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { addTranscriptMessage, addTranscriptBreadcrumb } = useTranscript();
  const { logClientEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED");
  const [userText, setUserText] = useState<string>("");
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);

  const [transcriptWidth, setTranscriptWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth * 0.6 : 400);
  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState<boolean>(false);

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

  useEffect(() => {
    const agents = allAgentSets["simpleExample"];
    const agentKeyToUse = agents[0]?.name || "";
    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, []);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && selectedAgentConfigSet && selectedAgentName) {
      const currentAgent = selectedAgentConfigSet.find(a => a.name === selectedAgentName);
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      updateSession(true);
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    if (!data.client_secret?.value) {
      setSessionStatus("DISCONNECTED");
      return null;
    }
    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
  if (sessionStatus !== "DISCONNECTED") return;
  setSessionStatus("CONNECTING");

  try {
    const EPHEMERAL_KEY = await fetchEphemeralKey();
    if (!EPHEMERAL_KEY) return;

    if (!audioElementRef.current) {
      audioElementRef.current = document.createElement("audio");
    }

    audioElementRef.current.autoplay = isAudioPlaybackEnabled;

    const { pc, dc } = await createRealtimeConnection(EPHEMERAL_KEY, audioElementRef);
    pcRef.current = pc;
    dcRef.current = dc;

    dc.addEventListener("message", e => handleServerEventRef.current(JSON.parse(e.data)));

    setSessionStatus("CONNECTED");

    updateSession(true); // ✅ Optional: trigger greeting on connect

    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(180);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          disconnectFromRealtime();
          alert("⏰ Time's up! Thanks for trying VoiceMate Pulse.");
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
      pcRef.current.getSenders().forEach(sender => sender.track?.stop());
      pcRef.current.close();
      pcRef.current = null;
    }
    dcRef.current = null;
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
  sendClientEvent(
    { type: "input_audio_buffer.clear" },
    "clear audio buffer on session update"
  );

  const currentAgent = selectedAgentConfigSet?.find(
    (a) => a.name === selectedAgentName
  );

  const turnDetection = {
  type: "server_vad",
  threshold: 0.5,
  prefix_padding_ms: 300,
  silence_duration_ms: 200,
  create_response: true,
};


  const instructions =
    currentAgent?.instructions ||
    `You are VoiceMate, a cheerful and confident assistant.
Speak clearly, with warmth and helpfulness. Think of yourself as a smart, supportive sister — not a robot.
Use natural pauses and convey excitement when appropriate.`;

  const tools = currentAgent?.tools || [];

  const sessionUpdateEvent = {
    type: "session.update",
    session: {
      modalities: ["text", "audio"],
      instructions,
      voice: "sage",
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: { model: "whisper-1" },
      turn_detection: turnDetection,
      tools,
    },
  };

  sendClientEvent(sessionUpdateEvent);

  if (shouldTriggerResponse) {
    sendSimulatedUserMessage("Hi there, go ahead and introduce yourself.");
  }
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

  const handleSendTextMessage = () => {
    const trimmed = userText.trim();
    if (!trimmed) return;
    sendClientEvent({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text: trimmed }] },
    });
    setUserText("");
    sendClientEvent({ type: "response.create" });
  };

  const onOrbClick = () => {
    if (sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    } else {
      disconnectFromRealtime();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex justify-between items-center px-4 pt-4">
        <div className="flex items-center gap-3">
          <Image src="/voicemate.svg" alt="VoiceMate Logo" width={40} height={40} />
          <div>
            <h1 className="text-xl font-bold">VoiceMate Pulse</h1>
            <p className="text-sm text-gray-400">Live Voice Demo – Tap the orb 👇🏼</p>
          </div>
        </div>
        {sessionStatus === "CONNECTED" && (
          <div className="text-sm font-medium">
            ⏳ {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
          </div>
        )}
      </header>

      {/* ORB UI */}
      <div className="flex justify-center items-center flex-col py-6">
        <motion.div
          className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-pink-600 shadow-2xl cursor-pointer"
          animate={{
            scale:
              sessionStatus === "DISCONNECTED"
                ? 1
                : isPTTUserSpeaking
                ? [1, 1.15, 1]
                : [1, 1.05, 1],
            opacity:
              sessionStatus === "DISCONNECTED"
                ? 0.4
                : isPTTUserSpeaking
                ? 1
                : 0.85,
          }}
          transition={{ duration: 1.2, repeat: Infinity }}
          onClick={onOrbClick}
        />
        <p className="text-sm text-gray-400 mt-2">
          {sessionStatus === "DISCONNECTED" && "🔌 Disconnected"}
          {sessionStatus === "CONNECTING" && "⏳ Connecting..."}
          {sessionStatus === "CONNECTED" && isPTTUserSpeaking && "🎙️ Listening..."}
          {sessionStatus === "CONNECTED" && !isPTTUserSpeaking && "🤔 Thinking..."}
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Transcript
          userText={userText}
          setUserText={setUserText}
          onSendMessage={handleSendTextMessage}
          canSend={sessionStatus === "CONNECTED" && dcRef.current?.readyState === "open"}
          transcriptWidth={transcriptWidth}
          setTranscriptWidth={setTranscriptWidth}
        />

        <Events
          isExpanded={isEventsPaneExpanded}
          transcriptWidth={transcriptWidth}
          setTranscriptWidth={setTranscriptWidth}
        />
      </div>

      <BottomToolbar
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={() => setIsPTTUserSpeaking(true)}
        handleTalkButtonUp={() => setIsPTTUserSpeaking(false)}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
      />
    </div>
  );
}

export default App;
