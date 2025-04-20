"use client";

import React, { useEffect, useRef } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";

type TranscriptProps = {
  userText?: string;
  setUserText?: (text: string) => void;
  onSendMessage?: () => void;
  canSend?: boolean;
};

export default function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
}: TranscriptProps) {
  const { transcriptItems } = useTranscript();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0; // Newest on top
    }
  }, [transcriptItems]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col-reverse gap-3 overflow-y-auto h-full pb-24"
    >
      {[...transcriptItems].reverse().map((item) => (
        <div
          key={item.itemId}
          className={`p-3 rounded-xl max-w-xl ${
            item.role === "user"
              ? "bg-blue-600 text-white self-end"
              : "bg-gray-200 text-black self-start"
          }`}
        >
          {item.text ?? "[No text]"}
        </div>
      ))}
    </div>
  );
}
