"use client";

import React, { useState, useEffect, useRef } from "react";
import { gapi } from 'gapi-script';
import { addCalendarEvent } from './utils/calendar';
import { addTask } from './utils/tasks';
import { parseAIResponse } from './types/ai';
import { LoadingScreen } from './components/LoadingScreen';
import { SignInScreen } from './components/SignInScreen';
import { ChatMessages } from './components/ChatMessages';
import { MessageInput } from './components/MessageInput';
import { Header } from './components/Header';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const CALENDAR_ID = process.env.NEXT_PUBLIC_CALENDAR_ID;
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/tasks'
].join(' ');

const Page = () => {
  // Manage Chat 
  const [userPrompt, setUserPrompt] = useState("");
  const [userHistory, setUserHistory] = useState<{ role: string; parts: { text: string }[] }[]>([]);

  // Manage States
  const [sending, setSending] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Manage Data
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

  const updateSigninStatus = async (isSignedIn : boolean) => {
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
          // @ts-ignore
          id: message.id
        })
      );

      const emailResponses = await Promise.all(emailPromises);
      // @ts-ignore
      setEmails(emailResponses.map(response => response.result));
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      // @ts-ignore
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
      // @ts-ignore
      const response = await gapi.client.tasks.tasklists.list({
        maxResults: 10
      });

      const taskLists = response.result.items || [];
      // @ts-ignore
      const taskListPromises = taskLists.map(taskList =>
        // @ts-ignore
        gapi.client.tasks.tasks.list({
          tasklist: taskList.id
        })
      );

      const taskListResponses = await Promise.all(taskListPromises);
      // @ts-ignore
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

    ///////////////////////////////
    ///////////////////////////////
    
    setUserHistory(prev => [...prev, { role: 'user', parts: [{ text: userPrompt }] }]);
    const currentPrompt = userPrompt;
    setUserPrompt('');

    /////////////////////////////// 
    ///////////////////////////////
    
    try {
      setSending(true);

      /////////////////////////////// 
      ///////////////////////////////
      
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

      /////////////////////////////// 
      ///////////////////////////////

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
      
      const parsedResponse = parseAIResponse(data.message);
      if (!parsedResponse) {
        throw new Error('Failed to parse AI response');
      }
      console.log('Parsed Response:', parsedResponse);

      /////////////////////////////// 
      ///////////////////////////////

      if (parsedResponse.code === 2 && parsedResponse.var) {
        console.log('Creating calendar event with data:', JSON.stringify(parsedResponse.var, null, 2));
        
        // @ts-ignore
        if (!parsedResponse.var.end?.dateTime) {
          // @ts-ignore
          if (parsedResponse.var.start?.dateTime) {
            // @ts-ignore
            const startDate = new Date(parsedResponse.var.start.dateTime);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
            // @ts-ignore
            parsedResponse.var.end = {
              dateTime: endDate.toISOString(),
              // @ts-ignore
              timeZone: parsedResponse.var.start.timeZone || 'Asia/Bangkok'
            };
          } else {
            throw new Error('Event must have either a start time or both start and end times');
          }
        }

        /////////////////////////////// 
        ///////////////////////////////

        console.log('Final event data:', JSON.stringify(parsedResponse.var, null, 2));
        // @ts-ignore
        let [success, result] = await addCalendarEvent('primary', parsedResponse.var);
        
        if (!success && result?.result?.error?.code === 403) {
          const reauthed = await reauthorize();
          if (reauthed) {
            // @ts-ignore
            [success, result] = await addCalendarEvent('primary', parsedResponse.var);
          }
        }
        
        console.log('Calendar event creation result:', success, result);
        
        if (!success) {
          throw new Error(`Failed to create calendar event: ${JSON.stringify(result)}`);
        }
        await fetchUpcomingEvents();
      }

      /////////////////////////////// 
      ///////////////////////////////

      else if (parsedResponse.code === 3 && parsedResponse.var) {
        console.log('Creating task:', parsedResponse.var);
        // @ts-ignore
        let [success, result] = await addTask(parsedResponse.var);
        
        if (!success && result?.result?.error?.code === 403) {
          const reauthed = await reauthorize();
          if (reauthed) {
            // @ts-ignore
            [success, result] = await addTask(parsedResponse.var);
          }
        }
        
        console.log('Task creation result:', success, result);
        
        if (!success) {
          throw new Error(`Failed to create task: ${JSON.stringify(result)}`);
        }
      }

      setUserHistory(prev => [...prev, { role: 'model', parts: [{ text: parsedResponse.output }] }]);
      
      setTimeout(() => {
        if (anchorRef.current) {
          anchorRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (error) {
      console.error('Error:', error);
      // @ts-ignore
      setUserHistory(prev => [...prev, { role: 'model', parts: [{ text: `Sorry, there was an error: ${error.message}` }] }]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <SignInScreen />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-4 flex flex-col h-screen">
        <Header 
          emailCount={emails.length}
          eventCount={events.length}
          taskCount={tasks.flat().length}
        />
        <ChatMessages 
          messages={userHistory}
          sending={sending}
          // @ts-ignore
          anchorRef={anchorRef}
        />
        <MessageInput
          value={userPrompt}
          onChange={setUserPrompt}
          onSubmit={handleRequest}
          sending={sending}
        />
      </div>
    </div>
  );
};

export default Page;