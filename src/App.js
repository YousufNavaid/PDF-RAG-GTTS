import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import FileUpload from "./components/FileUpload";
import Messages from "./components/Messages";
import QueryInput from "./components/QueryInput";

axios.defaults.baseURL = "http://localhost:8000";

const speak = (text) => {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "en-US";
  speechSynthesis.speak(msg);
};

const App = () => {
  const [sessionId, setSessionId] = useState(null);
  const [query, setQuery] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false); // Track if we are waiting for a response

  const queryInputRef = useRef(null);
  const uploadPdfButtonRef = useRef(null); // Reference for the "Upload PDF" button
  const choosePdfButtonRef = useRef(null); // Reference for the "Choose PDF" button

  // File upload handler
  const handleUploadPdf = async () => {
    if (!pdfFile) {
      speak("Please choose a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", pdfFile);

    try {
      const response = await axios.post("/upload_pdf/", formData);
      setSessionId(response.data.session_id);

      speak("PDF uploaded successfully.");
    } catch (error) {
      speak("There was an error uploading the PDF.");
    }
  };

  // Query submit handler
  const handleQuerySubmit = async () => {
    if (!query || !sessionId) {
      speak("Please upload a PDF and enter a query.");
      return;
    }

    try {
      setIsLoading(true);
      setWaitingForResponse(true); // Start waiting for the response
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "user", text: query },
      ]);

      speak("Processing your query...");
      setQuery("");

      const response = await axios.post("/query/", {
        query: query,
        session_id: sessionId,
      });

      const { response: answer } = response.data;

      // Add AI response message
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "ai", text: answer },
      ]);

      // Read the response aloud
      speak(answer);

      setIsLoading(false);
      setWaitingForResponse(false); // End waiting for response
    } catch (error) {
      speak("Something went wrong.");
      setIsLoading(false);
      setWaitingForResponse(false); // End waiting for response on error
    }
  };

  useEffect(() => {
    // Key press event handler
    const handleKeyPress = (e) => {
      let voiceMessage;

      // Reset action (Escape key)
      if (e.key === "Escape") {
        voiceMessage = "Resetting to the start.";
        setMessages([]); // Clear messages
        setQuery("");
        setSessionId(null);
        speak(voiceMessage);
      }

      // File upload action (ArrowUp key)
      else if (e.key === "ArrowUp") {
        voiceMessage = "Opening file upload.";
        choosePdfButtonRef.current?.click(); // Trigger file input button click
        speak(voiceMessage);
      }

      // Focus on the query input (ArrowRight key)
      else if (e.key === "ArrowRight") {
        queryInputRef.current?.focus();
        voiceMessage = "Focusing on the query input.";
        speak(voiceMessage);
      }

      // Submit query (Enter key)
      else if (e.key === "Enter" && !e.shiftKey) {
        const isButtonEnabled =
          query && sessionId && !isLoading && !waitingForResponse;
        if (isButtonEnabled) {
          voiceMessage = "Submitting your query.";
          speak(voiceMessage);
          handleQuerySubmit(); // Submit the query
        }
      }

      // Upload file action (ArrowDown key)
      else if (e.key === "ArrowDown") {
        voiceMessage = "Choosing file.";
        uploadPdfButtonRef.current?.click(); // Trigger upload button click
        speak(voiceMessage);
      }
    };

    // Attach keydown event listener
    window.addEventListener("keydown", handleKeyPress);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [query, sessionId, isLoading, waitingForResponse]);

  return (
    <div className="h-[100vh] px-4 pb-6 flex flex-col justify-between items-center max-w-full mx-auto rounded-lg">
      <div className="w-full border py-4 flex justify-center items-center backdrop-blur-md bg-white/30 border-white/20 shadow-sm rounded-lg">
        <h1 className="text-center text-2xl font-bold text-black">
          Visual Impaired GPT
        </h1>
      </div>

      <div className="w-full flex flex-col justify-between items-center">
        <Messages messages={messages} />
        <FileUpload
          setPdfFile={setPdfFile}
          handleUploadPdf={handleUploadPdf}
          pdfFile={pdfFile}
          uploadPdfButtonRef={uploadPdfButtonRef}
          choosePdfButtonRef={choosePdfButtonRef}
        />
        <QueryInput
          query={query}
          setQuery={setQuery}
          queryInputRef={queryInputRef}
          handleQuerySubmit={handleQuerySubmit}
          disabled={waitingForResponse}
        />
        {waitingForResponse && (
          <p className="text-center text-gray-500 mt-4">
            Waiting for response... Please wait before entering a new query.
          </p>
        )}
      </div>
    </div>
  );
};

export default App;
