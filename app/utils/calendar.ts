import { gapi } from 'gapi-script';

/**
 * Required scopes for Google Calendar API
 */
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/tasks'
].join(' ');

/**
 * Interface for Google Calendar Event
 */
export interface CalendarEvent {
  summary: string;
  location?: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  recurrence?: string[];
  attendees?: { email: string }[];
  reminders?: {
    useDefault: boolean;
    overrides?: {
      method: 'email' | 'popup';
      minutes: number;
    }[];
  };
}

/**
 * Find the Events calendar or fall back to primary
 */
const findEventsCalendar = async (): Promise<string> => {
  try {
    // @ts-ignore - Google Calendar API types are not complete
    const response = await gapi.client.calendar.calendarList.list();
    const calendars = response.result.items || [];
    
    // Look for Events calendar
    const eventsCalendar = calendars.find(cal => cal.summary === 'Events');
    return eventsCalendar?.id || 'primary';
  } catch (error) {
    console.error('Error finding Events calendar:', error);
    return 'primary';
  }
};

/**
 * Validate calendar event data
 */
const validateEvent = (event: CalendarEvent): void => {
  if (!event.summary) {
    throw new Error('Event must have a summary');
  }

  if (!event.start?.dateTime) {
    throw new Error('Event must have a start time');
  }

  if (!event.end?.dateTime) {
    throw new Error('Event must have an end time');
  }

  // Validate date format
  try {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    
    if (isNaN(start.getTime())) {
      throw new Error('Invalid start time format');
    }
    if (isNaN(end.getTime())) {
      throw new Error('Invalid end time format');
    }
    if (end <= start) {
      throw new Error('End time must be after start time');
    }
  } catch (error) {
    throw new Error(`Invalid date format: ${error.message}`);
  }

  // Ensure timeZone is present
  if (!event.start.timeZone) {
    event.start.timeZone = 'Asia/Bangkok';
  }
  if (!event.end.timeZone) {
    event.end.timeZone = event.start.timeZone;
  }
};

/**
 * Add a calendar event to Google Calendar
 * @param calendarId - ID of the calendar to add the event to (not used, will use Events calendar)
 * @param event - Calendar event data
 * @returns [success, result] - Tuple of success boolean and result/error
 */
export const addCalendarEvent = async (calendarId: string, event: CalendarEvent): Promise<[boolean, any]> => {
  try {
    // Check if we're authenticated
    // @ts-ignore - Google Auth types are not complete
    if (!gapi.auth2?.getAuthInstance()?.isSignedIn.get()) {
      throw new Error('Not authenticated');
    }

    // Validate and normalize the event data
    validateEvent(event);

    // Find the Events calendar
    const eventsCalendarId = await findEventsCalendar();

    console.log('Sending event to calendar:', JSON.stringify(event, null, 2));
    // @ts-ignore - Google Calendar API types are not complete
    const response = await gapi.client.calendar.events.insert({
      calendarId: eventsCalendarId,
      resource: event,
    });

    console.log('Calendar event created:', response);
    return [true, response];
  } catch (err) {
    console.error('Error adding calendar event:', err);
    return [false, err];
  }
};
