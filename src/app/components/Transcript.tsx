"use client";

import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranscript } from "@/app/contexts/TranscriptContext";

function Transcript({}) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      console.error("Failed to copy transcript");
    }
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
