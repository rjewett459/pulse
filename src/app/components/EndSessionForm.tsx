import React, { useState } from "react";

interface EndSessionFormProps {
  onSubmitSuccess: () => void;
}

const EndSessionForm: React.FC<EndSessionFormProps> = ({ onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isValid = formData.name && formData.email && formData.phone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      const response = await fetch("https://formspree.io/f/mjkyqqgj", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        onSubmitSuccess();
      }
    } catch (err) {
      console.error("Form submission error:", err);
    }
  };

  if (submitted) {
    return (
      <div className="text-center text-white">
        <h2 className="text-xl font-bold">✅ You're good to go!</h2>
        <p className="text-sm text-gray-300 mt-2">Thanks for your info.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">⚠️ Before continuing, please share your info</h2>

      <input
        type="text"
        name="name"
        placeholder="Your name"
        value={formData.name}
        onChange={handleChange}
        className="w-full mb-3 p-2 border rounded"
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Your email"
        value={formData.email}
        onChange={handleChange}
        className="w-full mb-3 p-2 border rounded"
        required
      />
      <input
        type="tel"
        name="phone"
        placeholder="Phone number"
        value={formData.phone}
        onChange={handleChange}
        className="w-full mb-4 p-2 border rounded"
        required
      />

      <button
        type="submit"
        disabled={!isValid}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Continue
      </button>
    </form>
  );
};

export default EndSessionForm;
