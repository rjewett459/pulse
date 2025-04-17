"use client";

import React, { useRef, useEffect, useState } from "react";
import { useEvent } from "@/app/contexts/EventContext";
import { LoggedEvent } from "@/app/types";

export interface EventsProps {
  isExpanded: boolean;
  setTranscriptWidth: (val: number) => void;
  transcriptWidth: number;
}

function Events({ isExpanded, setTranscriptWidth, transcriptWidth }: EventsProps) {
  const [prevEventLogs, setPrevEventLogs] = useState<LoggedEvent[]>([]);
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);
  const dragBarRef = useRef<HTMLDivElement | null>(null);
  const { loggedEvents, toggleExpand } = useEvent();

  const getDirectionArrow = (direction: string) => {
    if (direction === "client") return { symbol: "▲", color: "#7f5af0" };
    if (direction === "server") return { symbol: "▼", color: "#2cb67d" };
    return { symbol: "•", color: "#555" };
  };

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventLogs.length;
    if (isExpanded && hasNewEvent && eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop = eventLogsContainerRef.current.scrollHeight;
    }
    setPrevEventLogs(loggedEvents);
  }, [loggedEvents, isExpanded]);

  // Drag to resize
  useEffect(() => {
    const drag = (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth > 100 && newWidth < window.innerWidth - 200) {
        setTranscriptWidth(newWidth);
      }
    };
    const stopDrag = () => {
      window.removeEventListener("mousemove", drag);
      window.removeEventListener("mouseup", stopDrag);
    };
    const startDrag = () => {
      window.addEventListener("mousemove", drag);
      window.addEventListener("mouseup", stopDrag);
    };
    const el = dragBarRef.current;
    if (el) el.addEventListener("mousedown", startDrag);
    return () => {
      if (el) el.removeEventListener("mousedown", startDrag);
    };
  }, [setTranscriptWidth]);

  return (
    <>
      {/* Divider for drag */}
      <div
        ref={dragBarRef}
        className="w-1 cursor-col-resize bg-gray-300 hover:bg-gray-500 transition-all duration-100"
        style={{ zIndex: 51 }}
      />

      <div
        className={`transition-all duration-300 ease-in-out bg-white shadow-md absolute md:static top-0 right-0 transform z-40 h-full ${
          isExpanded ? "translate-x-0" : "translate-x-full"
        } w-[calc(100%-${transcriptWidth}px)] md:w-[300px]`}
      >
        {isExpanded && (
          <>
            {/* Logs Header */}
            <div className="font-semibold px-6 py-4 sticky top-0 z-10 text-base border-b bg-white">
              Logs
            </div>

            {/* Scrollable Logs */}
            <div
              ref={eventLogsContainerRef}
              className="overflow-y-auto px-2"
              style={{ maxHeight: "calc(100vh - 120px)" }}
            >
              {loggedEvents.map((log) => {
                const arrowInfo = getDirectionArrow(log.direction);
                const isError =
                  log.eventName.toLowerCase().includes("error") ||
                  log.eventData?.response?.status_details?.error != null;

                return (
                  <div key={log.id} className="border-t border-gray-200 py-2 px-4 font-mono">
                    <div
                      onClick={() => toggleExpand(log.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center flex-1">
                        <span style={{ color: arrowInfo.color }} className="ml-1 mr-2">
                          {arrowInfo.symbol}
                        </span>
                        <span className={`flex-1 text-sm ${isError ? "text-red-600" : "text-gray-800"}`}>
                          {log.eventName}
                        </span>
                      </div>
                      <div className="text-gray-500 ml-1 text-xs whitespace-nowrap">
                        {log.timestamp}
                      </div>
                    </div>

                    {log.expanded && log.eventData && (
                      <div className="text-gray-800 text-left">
                        <pre className="border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
                          {JSON.stringify(log.eventData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default Events;
