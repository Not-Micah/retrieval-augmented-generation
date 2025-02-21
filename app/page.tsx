"use client";

import React, { useEffect, useState } from 'react';
import { gapi } from 'gapi-script';
import Event from './components/Event';
import Message from './components/Message';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const CALENDAR_ID = process.env.NEXT_PUBLIC_CALENDAR_ID;
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [messages, setMessages] = useState([]);
  // @ts-ignore
  const [events, setEvents] = useState([]);

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
  const updateSigninStatus = (isSignedIn) => {
    setIsAuthenticated(isSignedIn);
    if (isSignedIn) {
      fetchMessages();
      getEvents();
    }
  };

  // @ts-ignore
  const handleAuthClick = () => {
    // @ts-ignore
    gapi.auth2.getAuthInstance().signIn();
  };

  // @ts-ignore
  const handleSignoutClick = () => {
    // @ts-ignore
    gapi.auth2.getAuthInstance().signOut();
  };

  const fetchMessages = () => {
    gapi.client.gmail.users.messages.list({
      userId: 'me',
      maxResults: 10
    }).then((response) => {
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

        Promise.all(messagePromises).then((responses) => {
          const messageDetails = responses.map((res) => res.result);
          // @ts-ignore
          setMessages(messageDetails);
        });
      }
    });
  };

  const getEvents = () => {
    gapi.client.request({
      path: `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
    }).then(
      (response) => {
        // @ts-ignore
        const events = response.result.items;
        setEvents(events);
      },
      function (err) {
        console.error("Error fetching calendar events:", err);
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {!isAuthenticated ? (
          <div className="text-center">
            <h1 className="text-3xl font-medium mb-8">Welcome to Your Dashboard</h1>
            <button 
              onClick={handleAuthClick} 
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-12">
              <h1 className="text-2xl font-medium">Dashboard</h1>
              <button 
                onClick={handleSignoutClick} 
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                Sign out
              </button>
            </div>
            
            <div className="space-y-12">
              <section>
                <h2 className="text-xl font-medium mb-6">Messages</h2>
                {messages.map((message, index) => (
                  <Message 
                    key={index}
                    /* @ts-ignore */
                    subject={message.payload.headers.find(header => header.name === 'Subject')?.value || 'No Subject'}
                    /* @ts-ignore */
                    from={message.payload.headers.find(header => header.name === 'From')?.value || 'Unknown Sender'}
                  />
                ))}
              </section>

              <section>
                <h2 className="text-xl font-medium mb-6">Calendar</h2>
                {events?.map((event, index) => (
                  // @ts-ignore
                  <Event 
                    key={index}
                    /* @ts-ignore */
                    description={event.summary || 'Untitled Event'} 
                  />
                ))}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;