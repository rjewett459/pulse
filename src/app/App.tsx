"use client";

import React, { useRef, useState, useEffect } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";
import { createRealtimeConnection } from "./lib/realtimeConnection";

function App() {
  const [sessionStatus, setSessionStatus] = useState("DISCONNECTED");
  const [sessionCount, setSessionCount] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("voicemate_sessions") || "0", 10);
    }
    return 0;
  });

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
    audioElemRef,
  });

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    if (sessionCount >= 2) return;
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
    } catch {
      setSessionStatus("DISCONNECTED");
    }
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

  return null; // Minimal UI for now (replace with your own)
}

export default App;
