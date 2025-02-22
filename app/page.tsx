"use client";

import React, { useState, useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { BeatLoader } from "react-spinners";
import { gapi } from 'gapi-script';
import { addCalendarEvent } from './utils/calendar';
import { addTask } from './utils/tasks';
import { parseAIResponse } from './types/ai';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const CALENDAR_ID = process.env.NEXT_PUBLIC_CALENDAR_ID;
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/tasks'
].join(' ');

const chatContainerStyle = {
  height: 'calc(100vh - 200px)',
  overflowY: 'scroll',
  scrollbarWidth: 'none',  /* Firefox */
  msOverflowStyle: 'none',  /* IE and Edge */
  '&::-webkit-scrollbar': {
    display: 'none'  /* Chrome, Safari and Opera */
  }
} as const;

const Page = () => {
  const [userPrompt, setUserPrompt] = useState("");
  const [userHistory, setUserHistory] = useState<{ role: string; parts: { text: string }[] }[]>([]);
  const [sending, setSending] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
          'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
          'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest'
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
      await Promise.all([fetchUnreadEmails(), fetchUpcomingEvents(), fetchTasks()]);
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

      const messages = response.result.messages || [];
      const emailPromises = messages.map(message =>
        gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: message.id
        })
      );

      const emailResponses = await Promise.all(emailPromises);
      setEmails(emailResponses.map(response => response.result));
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await gapi.client.calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: 'startTime'
      });

      setEvents(response.result.items || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await gapi.client.tasks.tasklists.list({
        maxResults: 10
      });

      const taskLists = response.result.items || [];
      const taskListPromises = taskLists.map(taskList =>
        gapi.client.tasks.tasks.list({
          tasklist: taskList.id
        })
      );

      const taskListResponses = await Promise.all(taskListPromises);
      setTasks(taskListResponses.map(response => response.result.items || []));
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const reauthorize = async () => {
    try {
      // @ts-ignore
      await gapi.auth2.getAuthInstance().signIn({
        scope: SCOPES
      });
      return true;
    } catch (error) {
      console.error('Reauthorization failed:', error);
      return false;
    }
  };

  const handleRequest = async () => {
    if (!userPrompt.trim()) return;
    
    // Add user message immediately
    setUserHistory(prev => [...prev, { role: 'user', parts: [{ text: userPrompt }] }]);
    const currentPrompt = userPrompt;
    setUserPrompt('');
    
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

      const taskContext = tasks.flat().map(task => ({
        // @ts-ignore
        title: task.title,
        // @ts-ignore
        due: task.due
      }));

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentPrompt,
          history: userHistory,
          context: {
            unreadEmails: emailContext,
            upcomingEvents: eventContext,
            upcomingTasks: taskContext
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Raw AI Response:', data.message);
      
      // Parse the AI response
      const parsedResponse = parseAIResponse(data.message);
      if (!parsedResponse) {
        throw new Error('Failed to parse AI response');
      }
      console.log('Parsed Response:', parsedResponse);

      // Handle calendar event creation if needed
      if (parsedResponse.code === 2 && parsedResponse.var) {
        console.log('Creating calendar event with data:', JSON.stringify(parsedResponse.var, null, 2));
        
        // Ensure end time is present
        if (!parsedResponse.var.end?.dateTime) {
          // If no end time but we have start time, set end time to 1 hour after start
          if (parsedResponse.var.start?.dateTime) {
            const startDate = new Date(parsedResponse.var.start.dateTime);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
            parsedResponse.var.end = {
              dateTime: endDate.toISOString(),
              timeZone: parsedResponse.var.start.timeZone || 'Asia/Bangkok'
            };
          } else {
            throw new Error('Event must have either a start time or both start and end times');
          }
        }

        console.log('Final event data:', JSON.stringify(parsedResponse.var, null, 2));
        let [success, result] = await addCalendarEvent('primary', parsedResponse.var);
        
        // If failed due to permissions, try to reauthorize
        if (!success && result?.result?.error?.code === 403) {
          const reauthed = await reauthorize();
          if (reauthed) {
            [success, result] = await addCalendarEvent('primary', parsedResponse.var);
          }
        }
        
        console.log('Calendar event creation result:', success, result);
        
        if (!success) {
          throw new Error(`Failed to create calendar event: ${JSON.stringify(result)}`);
        }
        // Refresh calendar events after adding new event
        await fetchUpcomingEvents();
      }
      // Handle task creation
      else if (parsedResponse.code === 3 && parsedResponse.var) {
        console.log('Creating task:', parsedResponse.var);
        let [success, result] = await addTask(parsedResponse.var);
        
        // If failed due to permissions, try to reauthorize
        if (!success && result?.result?.error?.code === 403) {
          const reauthed = await reauthorize();
          if (reauthed) {
            [success, result] = await addTask(parsedResponse.var);
          }
        }
        
        console.log('Task creation result:', success, result);
        
        if (!success) {
          throw new Error(`Failed to create task: ${JSON.stringify(result)}`);
        }
      }

      // Update chat history with AI response
      setUserHistory(prev => [...prev, { role: 'model', parts: [{ text: parsedResponse.output }] }]);
      
      // Scroll to bottom
      setTimeout(() => {
        if (anchorRef.current) {
          anchorRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (error) {
      console.error('Error:', error);
      // Add error to chat history
      setUserHistory(prev => [...prev, { role: 'model', parts: [{ text: `Sorry, there was an error: ${error.message}` }] }]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <BeatLoader color="#000000" />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-4 flex flex-col h-screen">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-light text-gray-800">Personal AI Assistant</h1>
            <button 
              // @ts-ignore
              onClick={() => gapi.auth2.getAuthInstance().signOut()}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
          <p className="text-center text-sm text-gray-500">
            {emails.length} unread emails • {events.length} upcoming events • {tasks.flat().length} tasks
          </p>
        </div>

        <div 
          className="flex-1 overflow-hidden"
          style={chatContainerStyle}
        >
          {userHistory.map((message, index) => (
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
                {message.parts[0].text}
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