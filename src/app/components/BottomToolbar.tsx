import React from "react";
import { SessionStatus } from "@/app/types";

interface BottomToolbarProps {
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (val: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
}

function BottomToolbar({
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
}: BottomToolbarProps) {
  

return (
  <div className="fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-300">
    <div className="flex justify-between items-center px-4 py-3 w-full text-sm sm:text-base">
      <div className="flex gap-2 items-center">
        <button
          onMouseDown={handleTalkButtonDown}
          onMouseUp={handleTalkButtonUp}
          className={`px-4 py-1 rounded-full ${
            isPTTUserSpeaking ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-800"
          }`}
        >
          🎙️ Talk
        </button>

        <button
          onClick={() => setIsAudioPlaybackEnabled(!isAudioPlaybackEnabled)}
          className={`px-4 py-1 rounded-full ${
            isAudioPlaybackEnabled ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-800"
          }`}
        >
          🔊 {isAudioPlaybackEnabled ? "On" : "Off"}
        </button>

        <button
          onClick={() => setIsEventsPaneExpanded(!isEventsPaneExpanded)}
          className={`px-4 py-1 rounded-full ${
            isEventsPaneExpanded ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-800"
          }`}
        >
          📋 Logs
        </button>
      </div>
    </div>
  </div>
);

}

export default BottomToolbar;
