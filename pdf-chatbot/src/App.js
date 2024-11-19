import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button, Input, message, Upload, Space, Row, Col, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";

axios.defaults.baseURL = "http://localhost:8000";

const { Text } = Typography;

const App = () => {
  const [sessionId, setSessionId] = useState(null);
  const [query, setQuery] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const queryInputRef = useRef(null);
  

  // Keybinding setup
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "ArrowDown") {
        document.getElementById("choose-btn").click();
      } else if (e.key === "ArrowUp") {
        document.getElementById("upload-file-btn").click();
      } else if (e.key === "ArrowRight") {
        queryInputRef.current?.focus();
      } else if (e.key === "Enter" && !e.shiftKey) {
        handleQuerySubmit();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [query]);

  // Upload PDF file handler
  const handleUploadPdf = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/upload_pdf/", formData);
      setSessionId(response.data.session_id);
      message.success(response.data.message);
    } catch (error) {
      message.error("Error uploading PDF");
    }
  };

  // Submit query handler
  const handleQuerySubmit = async () => {
    if (!query || !sessionId) {
      message.error("Please upload a PDF and enter a query.");
      return;
    }

    try {
      setIsLoading(true);

      // Add the user message to the conversation
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "user", text: query },
      ]);

      const response = await axios.post("/query/", {
        query: query,
        session_id: sessionId,
      });

      const { response: answer } = response.data;
      
      message.success("Query processed successfully");

      // Add the AI response to the conversation
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "ai", text: answer },
      ]);

      // Handle audio playback with error handling
      //console.log(audio_path);
      const audioResp = require("./response.mp3");
      new Audio(audioResp).play();

      // Clear the query input field
      setQuery("");
      setIsLoading(false);
    } catch (error) {
      message.error("Something went wrong...");
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ textAlign: "center" }}>PDF Chatbot with TTS</h1>

      {/* Chat container */}
      <div
        style={{
          height: "400px",
          overflowY: "auto",
          marginBottom: "20px",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        {messages.map((message, index) => (
          <Row key={index} style={{ marginBottom: "10px" }}>
            <Col
              span={24}
              style={{
                display: "flex",
                justifyContent: message.type === "ai" ? "flex-start" : "flex-end",
              }}
            >
              <div
                style={{
                  background: message.type === "ai" ? "#e6f7ff" : "#f4f4f8",
                  padding: "10px 15px",
                  borderRadius: "20px",
                  maxWidth: "70%",
                }}
              >
                <Text>{message.text}</Text>
              </div>
            </Col>
          </Row>
        ))}
      </div>

      {/* PDF Upload */}
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Upload
          id="choose-btn"
          beforeUpload={(file) => {
            setPdfFile(file);
            return false; // Prevent auto upload
          }}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} id="upload-btn">
            Choose PDF
          </Button>
        </Upload>

        <Button
          type="primary"
          id="upload-file-btn"
          onClick={() => handleUploadPdf(pdfFile)}
          disabled={!pdfFile}
        >
          Upload PDF
        </Button>

        {/* Query input */}
        <Input.TextArea
          ref={queryInputRef}
          rows={4}
          placeholder="Enter your query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          type="primary"
          onClick={handleQuerySubmit}
          disabled={!query || !sessionId || isLoading}
        >
          Ask Query
        </Button>
      </Space>
    </div>
  );
};

export default App;
