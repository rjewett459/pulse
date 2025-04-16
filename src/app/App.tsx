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
  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
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

  useEffect(() => {
    if (sessionStatus === "CONNECTED") updateSession();
  }, [isPTTActive]);

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

    const currentAgent = selectedAgentConfigSet?.find(a => a.name === selectedAgentName);
    const tools = currentAgent?.tools || [];

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: `You are a warm, clear, and confident voice assistant. Speak like you're helping a close friend or sister—sincere, supportive, and helpful.`,
        voice: "sage",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: isPTTActive
          ? null
          : {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200,
              create_response: true,
            },
        tools,
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
<div onClick={() => window.location.reload()} style={{ cursor: "pointer" }}>
  <Image src="/voicemate.svg" alt="VoiceMate Logo" width={40} height={40} />
</div>

      {/* Toggle to show logs on mobile */}
      <div className="absolute top-4 right-4 z-50 md:hidden">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <input
            type="checkbox"
            checked={isEventsPaneExpanded}
            onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
          />
          Show Logs
        </label>
      </div>

      <div className="text-base flex flex-col h-screen bg-gray-100 text-gray-800 relative">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 px-2 sm:px-4 overflow-hidden relative">
          <Transcript
            userText={userText}
            setUserText={setUserText}
            onSendMessage={handleSendTextMessage}
            canSend={sessionStatus === "CONNECTED" && dcRef.current?.readyState === "open"}
          />

          {/* Slide-in logs on mobile */}
          <div
            className={`absolute top-0 right-0 h-full w-3/4 max-w-sm bg-white border-l border-gray-300 z-40 shadow-md transform transition-transform duration-300 ease-in-out ${
              isEventsPaneExpanded ? "translate-x-0" : "translate-x-full"
            } md:static md:transform-none md:w-[300px] md:border-0 md:shadow-none`}
          >
            <Events isExpanded={isEventsPaneExpanded} />
          </div>
        </div>

        <BottomToolbar
          sessionStatus={sessionStatus}
          onToggleConnection={onToggleConnection}
          isPTTActive={isPTTActive}
          setIsPTTActive={setIsPTTActive}
          isPTTUserSpeaking={isPTTUserSpeaking}
          handleTalkButtonDown={() => setIsPTTUserSpeaking(true)}
          handleTalkButtonUp={() => setIsPTTUserSpeaking(false)}
          isEventsPaneExpanded={isEventsPaneExpanded}
          setIsEventsPaneExpanded={setIsEventsPaneExpanded}
          isAudioPlaybackEnabled={isAudioPlaybackEnabled}
          setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        />
      </div>
    </>
  );
}


export default App;
