"use client";

import React, { useRef, useEffect } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";

interface TranscriptProps {
  userText: string;
  setUserText: (text: string) => void;
  onSendMessage: (text: string) => void;
}

const Transcript: React.FC<TranscriptProps> = ({
  userText,
  setUserText,
  onSendMessage,
}) => {
  const { transcriptItems } = useTranscript();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptItems]);

  return (
    <div className="flex flex-col space-y-2 pb-28">
      {[...transcriptItems].map((item) => (
        <div
          key={item.itemId}
          className={`px-4 py-2 rounded-lg max-w-[90%] ${
            item.role === "user"
              ? "bg-blue-600 self-end text-white"
              : "bg-gray-700 self-start text-white"
          }`}
        >
          {item.text}
        </div>
      ))}

      <div ref={bottomRef} />

      <div className="fixed bottom-0 left-0 w-full bg-black border-t border-gray-700 px-4 py-3 z-40">
        <input
          type="text"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          placeholder="Type a message..."
          className="w-full rounded-full p-3 bg-gray-800 text-white placeholder-gray-400 border border-gray-600"
          onKeyDown={(e) => {
            if (e.key === "Enter" && userText.trim()) {
              onSendMessage(userText.trim());
            }
          }}
        />
      </div>
    </div>
  );
};

export default Transcript;
