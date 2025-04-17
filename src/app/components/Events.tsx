"use client";

import React, { useRef, useEffect, useState } from "react";
import { useEvent } from "@/app/contexts/EventContext";
import { LoggedEvent } from "@/app/types";

export interface EventsProps {
  isExpanded: boolean;
}

function Events({ isExpanded }: EventsProps) {
  const [prevEventLogs, setPrevEventLogs] = useState<LoggedEvent[]>([]);
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);
  const { loggedEvents, toggleExpand } = useEvent();

  const getDirectionArrow = (direction: string) => {
    if (direction === "client") return { symbol: "▲", color: "#7f5af0" };
    if (direction === "server") return { symbol: "▼", color: "#2cb67d" };
    return { symbol: "•", color: "#555" };
  };

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventLogs.length;

    if (isExpanded && hasNewEvent && eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop =
        eventLogsContainerRef.current.scrollHeight;
    }

    setPrevEventLogs(loggedEvents);
  }, [loggedEvents, isExpanded]);

  return (
    <>
      <div
        className={`transition-all duration-300 ease-in-out bg-white z-40 shadow-md absolute md:static top-0 right-0 transform ${
          isExpanded ? "translate-x-0" : "translate-x-full"
        } 
        w-full max-w-[90vw] md:max-w-sm md:w-[300px] border-l border-gray-300 md:border-0 md:shadow-none`}
        style={{ height: "100%" }}
      >
        {isExpanded && (
          <>
            {/* Close Logs hidden on mobile */}
            <div className="hidden md:flex justify-end px-4 pt-3">
              <button
                onClick={() => toggleExpand("")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close Logs ✖
              </button>
            </div>

            {/* Logs Header */}
            <div className="font-semibold px-4 py-3 sticky top-0 z-10 text-base border-b bg-white">
              Logs
            </div>

            {/* Scrollable logs */}
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
                  <div
                    key={log.id}
                    className="border-t border-gray-200 py-2 px-3 font-mono"
                  >
                    <div
                      onClick={() => toggleExpand(log.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center flex-1">
                        <span
                          style={{ color: arrowInfo.color }}
                          className="ml-1 mr-2"
                        >
                          {arrowInfo.symbol}
                        </span>
                        <span
                          className={`flex-1 text-sm ${
                            isError ? "text-red-600" : "text-gray-800"
                          }`}
                        >
                          {log.eventName}
                        </span>
                      </div>
                      <div className="text-gray-500 ml-1 text-xs whitespace-nowrap">
                        {log.timestamp}
                      </div>
                    </div>

                    {log.expanded && log.eventData && (
                      <div className="text-gray-800 text-left">
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2">
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
