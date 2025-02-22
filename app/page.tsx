"use client";

import React, { useState, useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { BeatLoader } from "react-spinners";
import { gapi } from 'gapi-script';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const CALENDAR_ID = process.env.NEXT_PUBLIC_CALENDAR_ID;
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly';

const Page = () => {
  const [userPrompt, setUserPrompt] = useState("");
  const [userHistory, setUserHistory] = useState<{ role: string; parts: { text: string }[] }[]>([]);
  const [sending, setSending] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [events, setEvents] = useState([]);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
          'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
        ],
        scope: SCOPES,
      }).then(() => {
        // @ts-ignore
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        // @ts-ignore
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());    
      });
    };

    gapi.load('client:auth2', initClient);
  }, []);

  // @ts-ignore
  const updateSigninStatus = async (isSignedIn) => {
    setIsAuthenticated(isSignedIn);
    if (isSignedIn) {
      await Promise.all([fetchUnreadEmails(), fetchUpcomingEvents()]);
    }
    setLoading(false);
  };

  const fetchUnreadEmails = async () => {
    try {
      const response = await gapi.client.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 10
      });

      // @ts-ignore
      const messages = response.result.messages;
      if (messages && messages.length > 0) {
        const messagePromises = messages.map((msg) =>
          gapi.client.gmail.users.messages.get({
            userId: 'me',
            // @ts-ignore
            id: msg.id,
          })
        );

        const responses = await Promise.all(messagePromises);
        const messageDetails = responses.map((res) => res.result);
        // @ts-ignore
        setEmails(messageDetails);
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await gapi.client.request({
        path: `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
        params: {
          timeMin: (new Date()).toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        }
      });

      // @ts-ignore
      setEvents(response.result.items);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    }
  };

  const handleRequest = async () => {
    if (!userPrompt.trim()) return;
    try {
      setSending(true);
      
      // Prepare the data context for Gemini
      const emailContext = emails.map(email => ({
        // @ts-ignore
        subject: email.payload.headers.find(header => header.name === 'Subject')?.value,
        // @ts-ignore
        from: email.payload.headers.find(header => header.name === 'From')?.value,
        // @ts-ignore
        snippet: email.snippet
      }));

      const eventContext = events.map(event => ({
        // @ts-ignore
        summary: event.summary,
        // @ts-ignore
        start: event.start?.dateTime || event.start?.date,
        // @ts-ignore
        end: event.end?.dateTime || event.end?.date
      }));

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          history: userHistory, 
          message: userPrompt,
          context: {
            unreadEmails: emailContext,
            upcomingEvents: eventContext
          }
        }),
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <button 
          // @ts-ignore
          onClick={() => gapi.auth2.getAuthInstance().signIn()}
          className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <BeatLoader size={12} color="#000000" />
          <p className="mt-4 text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-grow flex flex-col max-w-3xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-light text-gray-800 text-center">Personal AI Assistant</h1>
          <p className="text-center text-sm text-gray-500 mt-2">
            {emails.length} unread emails • {events.length} upcoming events
          </p>
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
            placeholder="Ask about your emails or calendar events..."
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