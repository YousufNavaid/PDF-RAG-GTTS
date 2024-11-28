import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import FileUpload from "./components/FileUpload";
import Messages from "./components/Messages";
import QueryInput from "./components/QueryInput";
import VoiceRecorder from "./components/VoiceRecorder";

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
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const queryInputRef = useRef(null);
  const uploadPdfButtonRef = useRef(null);
  const choosePdfButtonRef = useRef(null);
  const recorderButtonRef = useRef(null);

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
      setWaitingForResponse(true);
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "user", text: query },
      ]);

      speak("Processing your query...");
      const response = await axios.post("/query/", {
        query: query,
        session_id: sessionId,
      });

      const { response: answer } = response.data;

      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "ai", text: answer },
      ]);

      speak(answer);
      setQuery("");
    } catch (error) {
      speak("Something went wrong.");
    } finally {
      setIsLoading(false);
      setWaitingForResponse(false);
    }
  };

  // Handle transcript from voice recorder
  const handleTranscript = (transcript) => {
    setQuery(transcript); // Update the query with the transcript from the voice recorder
  };

  // Speak welcome message on first interaction
  useEffect(() => {
      speak("Hi! Welcome to Visual Impaired GPT. Please upload a PDF and enter a query. Press Tab for Instructions");
      setHasSpokenWelcome(true);
  }, []);

  // Keypress handling
  useEffect(() => {
    const handleKeyPress = (e) => {
      let voiceMessage;

      if (e.key === "Escape") {
        voiceMessage = "Resetting to the start.";
        setMessages([]);
        setQuery("");
        setSessionId(null);
        speak(voiceMessage);
      } else if (e.key === "Tab") {
        voiceMessage = "Instructions. Down arrow to select PDF. Up arrow to upload the selected PDF. Right arrow to type your query. Left arrow to start and stop recording. Escape to start again. Tab for repeating these instructions.";
        uploadPdfButtonRef.current?.click();
        speak(voiceMessage);
      } else if (e.key === "ArrowUp") {
        voiceMessage = "Uploading PDF";
        uploadPdfButtonRef.current?.click();
        speak(voiceMessage);
      } else if (e.key === "ArrowDown") {
        voiceMessage = "Select your PDF by typing its name and then hit Enter.";
        choosePdfButtonRef.current?.click();
        speak(voiceMessage);
      } else if (e.key === "ArrowRight") {
        queryInputRef.current?.focus();
        voiceMessage = "Please type your query and hit enter";
        speak(voiceMessage);
      } else if (e.key === "ArrowLeft") {
        recorderButtonRef.current?.click();
        setIsRecording((prev) => {
          const newState = !prev;
          voiceMessage = newState ? "Recording" : "Recording completed";
          speak(voiceMessage);
          return newState;
        });
      } else if (e.key === "Enter" && !e.shiftKey) {
        const isButtonEnabled =
          query && sessionId && !isLoading && !waitingForResponse;
        if (isButtonEnabled) {
          voiceMessage = "Submitting your query.";
          speak(voiceMessage);
          handleQuerySubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
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
        <div className="w-full flex items-center space-x-4 mt-4">
          <QueryInput
            query={query}
            setQuery={setQuery}
            queryInputRef={queryInputRef}
            handleQuerySubmit={handleQuerySubmit}
            disabled={waitingForResponse}
          />
          <VoiceRecorder 
            onVoiceInput={handleTranscript}
            recorderButtonRef={recorderButtonRef} />
        </div>
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