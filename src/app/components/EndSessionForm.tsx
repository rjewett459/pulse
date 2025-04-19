"use client";

import React, { useState } from "react";

interface EndSessionFormProps {
  open: boolean;
  onClose: () => void;
}

const EndSessionForm: React.FC<EndSessionFormProps> = ({ open, onClose }) => {
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white text-black p-6 rounded-2xl max-w-md w-full shadow-xl">
        {submitted ? (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">✅ Thank you!</h2>
            <p className="text-gray-700">We’ve received your details. We’ll be in touch soon.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        ) : (
          <form
            action="https://formspree.io/f/mjkyqqgj"
            method="POST"
            onSubmit={() => setSubmitted(true)}
          >
            <h2 className="text-xl font-bold mb-4">Let’s stay connected</h2>
            <label className="block mb-2">
              <span className="block text-sm font-medium text-gray-700">Your Name</span>
              <input
                type="text"
                name="name"
                required
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-black focus:border-black"
              />
            </label>
            <label className="block mb-2">
              <span className="block text-sm font-medium text-gray-700">Email Address</span>
              <input
                type="email"
                name="email"
                required
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-black focus:border-black"
              />
            </label>
            <label className="block mb-4">
              <span className="block text-sm font-medium text-gray-700">Phone Number</span>
              <input
                type="tel"
                name="phone"
                required
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-black focus:border-black"
              />
            </label>
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded-full hover:bg-gray-800"
            >
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EndSessionForm;
