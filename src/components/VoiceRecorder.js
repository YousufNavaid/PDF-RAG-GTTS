import React, { useState, useEffect } from "react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";

const VoiceRecorder = ({ onVoiceInput, recorderButtonRef}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check if SpeechRecognition is supported
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onVoiceInput(transcript); // Pass voice input back to the parent
      };
      setRecognition(rec);
    } else {
      console.error("Speech recognition is not supported in this browser.");
    }
  }, [onVoiceInput]);

  const toggleRecording = () => {
    if (!recognition) return;

    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
    setIsRecording((prev) => !prev);
  };

  return (
    <div className="flex flex-col items-center mt-4">
        <button
            ref={recorderButtonRef}
            onClick={toggleRecording}
            className={`p-3 rounded-full text-white ${
            isRecording ? "bg-red-500" : "bg-blue-500"
            }`}
        >
            {isRecording ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
        <p className="text-gray-600 mt-2">
            {isRecording ? "Listening" : "Record"}
        </p>
    </div>
  );
};

export default VoiceRecorder;