"use client";

import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";

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

  const [transcriptWidth, setTranscriptWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth * 0.6 : 400
  );

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState<boolean>(false); // Logs 
  const [userText, setUserText] = useState<string>("");
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(true);

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

  const updateSession = (shouldTriggerResponse = false) => {
    sendClientEvent({ type: "input_audio_buffer.clear" });

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: `You are a warm, clear, and confident voice assistant. Speak like you're helping a close friend or sister—sincere, supportive, and helpful.`,
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
      },
    };

    sendClientEvent(sessionUpdateEvent);
    if (shouldTriggerResponse) sendSimulatedUserMessage("hi");
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

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
    } else {
      connectToRealtime();
    }
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

  return (
  <>
    {/* Header Section */}
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-800 pb-24">
      {/* Header */}
      <div className="px-4 pt-4 sm:pt-6 flex items-center gap-3">
        <div onClick={() => window.location.reload()} style={{ cursor: "pointer" }}>
          <Image src="/voicemate.svg" alt="VoiceMate Logo" width={40} height={40} />
        </div>
        <div className="flex flex-col text-center sm:text-left">
          <h1 className="text-lg sm:text-xl font-semibold leading-tight text-gray-800">
            VoiceMate Pulse
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Live Voice Demo – Tap Connect 👇🏼 to Begin
          </p>
          <p className="text-sm text-gray-400 mt-0.5">
            Enjoy a couple of minutes on us!
          </p>
        </div>
      </div>

      {/* Transcript + Logs with Resizer */}
      <div className="flex-grow flex relative overflow-hidden pb-24">
        {/* Left: Transcript */}
        <div className="flex-grow min-w-0 overflow-hidden">
          <Transcript
  userText={userText}
  setUserText={setUserText}
  onSendMessage={handleSendTextMessage}
  canSend={sessionStatus === "CONNECTED" && dcRef.current?.readyState === "open"}
  transcriptWidth={transcriptWidth}
  setTranscriptWidth={setTranscriptWidth}
/>


        </div>

        {/* Resizer */}
        <div
          className="hidden md:block w-1 bg-gray-300 cursor-col-resize hover:bg-gray-500"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = document.querySelector(".flex-grow")!.clientWidth;

            const onMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const transcriptPanel = document.querySelector(".flex-grow") as HTMLElement;
              if (transcriptPanel) {
                transcriptPanel.style.flex = "none";
                transcriptPanel.style.width = `${startWidth + deltaX}px`;
              }
            };

            const onMouseUp = () => {
              window.removeEventListener("mousemove", onMouseMove);
              window.removeEventListener("mouseup", onMouseUp);
            };

            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
          }}
        ></div>

        {/* Right: Logs */}
        <div
          className={`fixed md:static top-0 right-0 bottom-16 h-auto md:h-full bg-white border-l border-gray-300 z-50 shadow-md transform transition-transform duration-300 ease-in-out ${
            isEventsPaneExpanded ? "translate-x-0" : "translate-x-full"
          } md:transform-none md:w-[300px] md:border-0 md:shadow-none`}
        >
          <Events
  isExpanded={isEventsPaneExpanded}
  transcriptWidth={transcriptWidth}
  setTranscriptWidth={setTranscriptWidth}
/>
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 w-full z-[9999] bg-white border-t border-gray-300">
        <BottomToolbar
          sessionStatus={sessionStatus}
          onToggleConnection={onToggleConnection}
          isPTTUserSpeaking={isPTTUserSpeaking}
          handleTalkButtonDown={() => setIsPTTUserSpeaking(true)}
          handleTalkButtonUp={() => setIsPTTUserSpeaking(false)}
          isEventsPaneExpanded={isEventsPaneExpanded}
          setIsEventsPaneExpanded={setIsEventsPaneExpanded}
          isAudioPlaybackEnabled={isAudioPlaybackEnabled}
          setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        />
      </div>
    </div>
  </>
);

}

export default App;
