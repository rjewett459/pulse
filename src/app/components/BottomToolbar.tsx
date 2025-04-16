import React from "react";
import { SessionStatus } from "@/app/types";

interface BottomToolbarProps {
  // Removed isPTTActive and setIsPTTActive
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (val: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
}


function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
}: BottomToolbarProps)

  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-white text-sm px-4 py-2 rounded-full w-full sm:w-36";
    const cursorClass = isConnecting ? "cursor-not-allowed" : "cursor-pointer";
    return isConnected
      ? `bg-red-600 hover:bg-red-700 ${cursorClass} ${baseClasses}`
      : `bg-black hover:bg-gray-900 ${cursorClass} ${baseClasses}`;
  }

  return (
    <div className="flex justify-between items-center w-full px-4 py-3 bg-white border-t border-gray-300 text-sm sm:text-base">
  <button
    onClick={onToggleConnection}
    className={`px-4 py-2 rounded-full font-semibold text-white ${
      sessionStatus === "CONNECTED" ? "bg-red-600" : "bg-green-600"
    }`}
  >
    {sessionStatus === "CONNECTED" ? "Disconnect" : "Connect"}
  </button>

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

  );
}

export default BottomToolbar;
