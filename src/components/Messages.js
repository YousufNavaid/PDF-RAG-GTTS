import React from "react";
import { Typography } from "antd"; // Keep only what's necessary

const { Text } = Typography; // Only use this if you need the Text component

const Messages = ({ messages }) => {
  return (
    <div className="md:w-[70%] w-full h-[70vh] overflow-y-scroll mb-4 p-4  rounded-lg">
      {messages.map((message, index) => (
        <div key={index} className="mb-4">
          <div
            className={`flex ${
              message.type === "ai" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`bg-${
                message.type === "ai" ? "blue" : "gray"
              }-100 text-${
                message.type === "ai" ? "blue" : "gray"
              }-800 p-4 rounded-lg max-w-xs`}
            >
              <p>{message.text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Messages;
