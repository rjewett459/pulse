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
    <div
      className={`transition-all duration-300 ease-in-out bg-white border-l border-gray-300 z-50 shadow-md md:static fixed top-0 right-0 w-3/4 max-w-sm md:w-[300px] md:border-0 md:shadow-none transform ${
        isExpanded ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ bottom: "64px" }} // leave room for toolbar
    >
      {isExpanded && (
        <>
          {/* Mobile Close Button */}
          <div className="md:hidden flex justify-end px-4 pt-3">
            <button
              onClick={() => toggleExpand("")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close Logs ✖
            </button>
          </div>

          {/* Logs Header */}
          <div className="font-semibold px-6 py-4 sticky top-0 z-10 text-base border-b bg-white">
            Logs
          </div>

          {/* Scrollable log container */}
          <div
            ref={eventLogsContainerRef}
            className="overflow-y-auto px-2"
            style={{ maxHeight: "calc(100vh - 160px)" }} // 64px for toolbar + header/padding
          >
            {loggedEvents.map((log) => {
              const arrowInfo = getDirectionArrow(log.direction);
              const isError =
                log.eventName.toLowerCase().includes("error") ||
                log.eventData?.response?.status_details?.error != null;

              return (
                <div
                  key={log.id}
                  className="border-t border-gray-200 py-2 px-4 font-mono"
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
  );
}

export default Events;
