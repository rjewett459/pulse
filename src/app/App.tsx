// ═══ App.tsx ═════════════════════════════════
"use client";

import React, { useEffect, useRef, useState } from "react";
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

  const timerRef = useRef(null);
  const dcRef = useRef(null);
  const pcRef = useRef(null);
  const audioElemRef = useRef(null);

  const sendClientEvent = (obj) => {
    if (dcRef.current?.readyState === "open") {
      logClientEvent(obj);
      dcRef.current.send(JSON.stringify(obj));
    }
  };

  const handleServerEventRef = useHandleServerEvent({ sendClientEvent, setSessionStatus });

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    if (sessionCount >= 2) return setShowShareModal(true);
    setSessionStatus("CONNECTING");
    try {
      const { client_secret } = await (await fetch("/api/session")).json();
      if (!client_secret?.value) throw new Error();
      if (!audioElemRef.current) audioElemRef.current = document.createElement("audio");
      audioElemRef.current.autoplay = true;
      const { pc, dc } = await createRealtimeConnection(client_secret.value, audioElemRef);
      pcRef.current = pc;
      dcRef.current = dc;
      dc.addEventListener("message", (e) => handleServerEventRef.current(JSON.parse(e.data)));
      setSessionStatus("CONNECTED");
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
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

  const sendSimulatedUserMessage = (text) => {
    const id = crypto.randomUUID();
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

      <div className="flex justify-center items-center py-6">
        <motion.div
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-2xl cursor-pointer"
          animate={sessionStatus === "CONNECTED" ? { scale: [1, 1.05, 1], opacity: 1 } : { scale: 1, opacity: 0.4 }}
          transition={sessionStatus === "CONNECTED" ? { duration: 1.2, repeat: Infinity } : { duration: 0 }}
          onClick={onOrbClick}
        />
        <p className="text-gray-400 text-sm mt-2 text-center">
          {sessionStatus === "DISCONNECTED" && "🔌 Disconnected"}
          {sessionStatus === "CONNECTING" && "⏳ Connecting..."}
          {sessionStatus === "CONNECTED" && "🤔 Thinking..."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <Transcript onSendMessage={() => sendSimulatedUserMessage(userText)} />
      </div>

      {!showShareModal && (
        <div className="fixed bottom-0 left-0 w-full bg-black border-t border-gray-700 px-4 py-3">
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
          background: linear-gradient(90deg, #7F00FF, #E100FF);
          color: #fff;
          border-radius: 9999px;
          padding: 0.5rem 1rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease-in-out;
        }
        .copy-button:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}

export default App;


// ═══ components/Transcript.tsx ══════════════════════
"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranscript } from "@/app/contexts/TranscriptContext";

function Transcript({ onSendMessage }) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef(null);
  const [justCopied, setJustCopied] = useState(false);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptItems]);

  const handleCopy = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="flex flex-col flex-1 bg-white/5 backdrop-blur-md min-h-0 rounded-2xl border border-white/10 shadow-lg p-4">
      <button onClick={handleCopy} className="copy-button self-end mb-2">
        {justCopied ? "✅ Copied!" : "📋 Copy"}
      </button>
      <div ref={transcriptRef} className="overflow-auto flex flex-col gap-y-4 flex-1">
        {transcriptItems.map((item) => {
          if (item.isHidden) return null;
          const { itemId, type, role, timestamp, title = "", data, expanded } = item;
          if (type === "MESSAGE") {
            const isUser = role === "user";
            const container = `flex flex-col ${isUser ? 'items-end' : 'items-start'}`;
            const bubble = `max-w-lg p-3 rounded-xl ${isUser ? 'bg-gray-900 text-gray-100' : 'bg-gray-800 text-gray-100'}`;
            const bracketed = title.startsWith('[') && title.endsWith(']');
            const display = bracketed ? title.slice(1, -1) : title;
            const style = bracketed ? 'italic text-gray-400' : '';
            return (
              <div key={itemId} className={container}>
                <div className={bubble}>
                  <div className={`text-xs ${isUser ? 'text-gray-400' : 'text-gray-500'} font-mono`}>{timestamp}</div>
                  <div className={`whitespace-pre-wrap ${style}`}><ReactMarkdown>{display}</ReactMarkdown></div>
                </div>
              </div>
            );
          }
          if (type === "BREADCRUMB") {
            return (
              <div key={itemId} className="flex flex-col items-start text-gray-500 text-sm">
                <span className="text-xs font-mono">{timestamp}</span>
                <div className={`whitespace-pre-wrap flex items-center font-mono text-sm text-gray-800 ${data ? 'cursor-pointer' : ''}`} onClick={() => data && toggleTranscriptItemExpand(itemId)}>
                  {data && <span className={`text-gray-400 mr-1 transform transition-transform ${expanded ? 'rotate-90' : 'rotate-0'}`}>▶</span>}
                  {title}
                </div>
                {expanded && data && (
                  <pre className="border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                )}
              </div>
            );
          }
          return (
            <div key={itemId} className="flex justify-center text-gray-500 text-sm italic font-mono">
              Unknown: {type} <span className="ml-2 text-xs">{timestamp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Transcript;
