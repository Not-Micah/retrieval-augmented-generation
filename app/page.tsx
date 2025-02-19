"use client";

import React, { useState, useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { BeatLoader } from "react-spinners";

const Page = () => {
  const [userPrompt, setUserPrompt] = useState("");
  const [userHistory, setUserHistory] = useState<
    { role: string; parts: { text: string }[] }[]
  >([]);
  const [sending, setSending] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleRequest = async () => {
    if (!userPrompt.trim()) return;
    try {
      setSending(true);
      const response = await fetch("http://localhost:3000/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: userHistory, message: userPrompt }),
      });
      const data = await response.json();

      setUserHistory((prev) => [
        ...prev,
        { role: "user", parts: [{ text: userPrompt }] },
        { role: "model", parts: [{ text: data.message }] },
      ]);
      setUserPrompt("");
    } catch (error) {
      console.error("Error fetching AI response:", error);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [userHistory]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-grow flex flex-col max-w-3xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-light text-gray-800 text-center">Chat Assistant</h1>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-6 mb-6">
          {userHistory.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-[15px] leading-relaxed">
                  {message.parts[0].text}
                </p>
              </div>
            </div>
          ))}
          
          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-3 rounded-lg">
                <BeatLoader size={8} color="#000000" />
              </div>
            </div>
          )}
          <div ref={anchorRef}></div>
        </div>

        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            handleRequest();
          }}
        >
          <input
            type="text"
            className="w-full p-4 pr-12 rounded-lg bg-gray-100 border-0 outline-none text-gray-800 placeholder-gray-400"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Type your message..."
          />
          <button
            type="submit"
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md transition-opacity ${
              sending ? "opacity-50" : "opacity-100 hover:opacity-80"
            }`}
            disabled={sending}
          >
            <IoSend size={20} className="text-gray-800" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Page;
