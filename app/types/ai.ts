import type { CalendarEvent } from '../utils/calendar';
import type { Task } from '../utils/tasks';

/**
 * Response codes from the AI:
 * 1: Read-only response (just displaying information)
 * 2: Calendar event creation request
 * 3: Task creation request
 */
export interface AIResponse {
  code: 1 | 2 | 3;
  output: string;
  var?: CalendarEvent | Task;
}

/**
 * Parse and validate AI response
 * @param response - Raw response string from AI
 * @returns Parsed and validated AIResponse or null if invalid
 */
export const parseAIResponse = (response: string): AIResponse | null => {
  try {
    const parsed = JSON.parse(response);
    
    // Validate basic structure
    if (
      typeof parsed !== 'object' ||
      !parsed ||
      typeof parsed.code !== 'number' ||
      ![1, 2, 3].includes(parsed.code) ||
      typeof parsed.output !== 'string'
    ) {
      console.error('Invalid response structure:', parsed);
      return null;
    }

    // Validate calendar event structure
    if (parsed.code === 2) {
      if (
        !parsed.var?.summary ||
        !parsed.var?.start?.dateTime ||
        !parsed.var?.end?.dateTime
      ) {
        console.error('Invalid calendar event structure:', parsed.var);
        return null;
      }
    }
    // Validate task structure
    else if (parsed.code === 3) {
      if (!parsed.var?.title) {
        console.error('Invalid task structure:', parsed.var);
        return null;
      }
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return null;
  }
};
