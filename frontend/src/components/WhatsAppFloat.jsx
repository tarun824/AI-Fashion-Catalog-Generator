import React from "react";
import "../styles/WhatsAppFloat.css";

const WhatsAppFloat = () => {
  const handleClick = () => {
    const phoneNumber = "919876543210"; // Update with actual number
    const message = encodeURIComponent(
      "Hi! I'm interested in your saree collection. Can you help me?",
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  return (
    <button
      className="whatsapp-float"
      onClick={handleClick}
      title="Chat on WhatsApp"
    >
      <svg viewBox="0 0 32 32" className="whatsapp-icon">
        <path
          fill="currentColor"
          d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 7.933-2.127c2.42 1.37 5.173 2.127 8.067 2.127 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.467c-2.482 0-4.908-0.646-7.07-1.87l-0.507-0.292-4.713 1.262 1.262-4.669-0.292-0.508c-1.207-2.100-1.847-4.507-1.847-6.923 0-7.435 6.032-13.467 13.467-13.467s13.467 6.032 13.467 13.467c0 7.435-6.032 13.467-13.467 13.467z"
        />
        <path
          fill="currentColor"
          d="M23.2 19.8c-0.4-0.2-2.4-1.2-2.8-1.3s-0.6-0.2-0.9 0.2-1 1.3-1.2 1.5-0.5 0.3-0.9 0.1-1.7-0.6-3.2-2c-1.2-1.1-2-2.4-2.2-2.8s0-0.6 0.2-0.8c0.2-0.2 0.4-0.5 0.6-0.7s0.3-0.4 0.4-0.7 0.1-0.5 0-0.7-0.9-2.1-1.2-2.9c-0.3-0.8-0.7-0.7-0.9-0.7s-0.5 0-0.8 0-0.7 0.1-1.1 0.5-1.5 1.5-1.5 3.6 1.5 4.2 1.7 4.5 3 4.6 7.3 6.4c1 0.4 1.8 0.7 2.4 0.9 1 0.3 2 0.3 2.7 0.2 0.8-0.1 2.4-1 2.8-2s0.4-1.8 0.3-2-0.4-0.3-0.8-0.5z"
        />
      </svg>
    </button>
  );
};

export default WhatsAppFloat;
