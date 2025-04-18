"use client";

import React from "react";

interface SharePulseProps {
  open: boolean;
  onClose: () => void;
}

const SharePulse = ({ open, onClose }: SharePulseProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-6">
      <div className="bg-white text-black rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-2">Session Complete ✅</h2>
        <p className="text-sm mb-4">
          Want to send your own VoiceMate Pulse™? We’ll notify you as soon as it’s live.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Thanks! We’ll be in touch.");
            onClose();
          }}
          className="space-y-4"
        >
          <input
            type="text"
            required
            placeholder="Name"
            className="w-full border px-4 py-2 rounded-lg"
          />
          <input
            type="email"
            required
            placeholder="Email"
            className="w-full border px-4 py-2 rounded-lg"
          />
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800"
          >
            Keep Me Updated 🚀
          </button>
        </form>

        <button
          onClick={onClose}
          className="mt-4 w-full text-sm text-gray-600 hover:text-black"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default SharePulse;
