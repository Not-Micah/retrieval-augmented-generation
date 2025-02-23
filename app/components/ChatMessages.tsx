import { BeatLoader } from "react-spinners";
import { RefObject } from "react";
import React from 'react';
import { formatMessageText } from '../utils/formatMessage';

interface ChatMessagesProps {
  messages: { role: string; parts: { text: string }[] }[];
  sending: boolean;
  anchorRef: RefObject<HTMLDivElement>;
}

export const ChatMessages = ({ messages, sending, anchorRef }: ChatMessagesProps) => {
  return (
    <div className="flex-1 overflow-y-scroll no-scrollbar">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`mb-4 ${
            message.role === "user" ? "text-right" : "text-left"
          }`}
        >
          <div
            className={`inline-block p-4 rounded-lg ${
              message.role === "user"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {formatMessageText(message.parts[0].text).map((line, i) => (
              <React.Fragment key={i}>
                <span dangerouslySetInnerHTML={{ __html: line }} />
                {i < formatMessageText(message.parts[0].text).length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
      {sending && (
        <div className="mb-4 text-left">
          <div className="inline-block p-4 rounded-lg bg-gray-100">
            <BeatLoader size={8} color="#000000" />
          </div>
        </div>
      )}
      <div ref={anchorRef} />
    </div>
  );
};
