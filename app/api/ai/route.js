import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_GEN_AI_KEY);

export async function POST(req) {
  try {
    const { message, history, context } = await req.json();

    ///////////
    const currentTime = new Date();
    const tomorrow = new Date(currentTime);
    tomorrow.setDate(currentTime.getDate() + 1);
    ///////////

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const prompt = `You are an AI assistant that helps manage emails, calendar events, and tasks. You have access to:
1. Unread emails: ${JSON.stringify(context.unreadEmails)}
2. Upcoming events: ${JSON.stringify(context.upcomingEvents)}
3. Upcoming tasks: ${JSON.stringify(context.upcomingTasks)}

IMPORTANT RULES:
1. ALWAYS return a properly formatted JSON response
2. For calendar events, ALWAYS include both start and end times
3. For calendar events, end time should be 1 hour after start time if not specified
4. ALWAYS use ISO 8601 format for dates with timezone
5. ALWAYS use Asia/Bangkok timezone
6. Current time is: ${currentTime.toISOString()}
7. Tomorrow is: ${tomorrow.toISOString()}
8. When user mentions "tomorrow", use EXACTLY this date: ${tomorrow.toISOString().split('T')[0]}
9. If you need more information from the user, use code 1 (NOT 2 or 3) and ask the question in the output
10. Only use code 2 or 3 when you have ALL required information to create the event or task

FORMATTING RULES:
1. ALWAYS use line breaks between different events (use \\n)
2. Use emojis appropriate to the event type
3. Format dates and times clearly
4. Use proper indentation and spacing
5. For lists, put each item on a new line
6. Preserve line breaks in the output

Response format must be:
{
  "code": number,    // 1 for read-only response, 2 for calendar event, 3 for task
  "output": string,  // Your response to show to the user
  "var": object     // Required for code 2 and 3, format shown below
}

Example responses:
1. Need more information:
{
  "code": 1,
  "output": "What time would you like to schedule the meeting for tomorrow?"
}

2. Listing events:
{
  "code": 1,
  "output": "📅 Here are your upcoming events:\\n\\n🏢 **Team Meeting**\\nTomorrow from 2:00 PM - 3:00 PM\\n\\n🎓 **Training Session**\\nMonday from 10:00 AM - 11:00 AM"
}

3. Creating calendar event:
{
  "code": 2,
  "output": "I've added the meeting to your calendar.",
  "var": {
    "summary": "Team Meeting",
    "start": {
      "dateTime": "${tomorrow.toISOString().split('T')[0]}T14:00:00+07:00",
      "timeZone": "Asia/Bangkok"
    },
    "end": {
      "dateTime": "${tomorrow.toISOString().split('T')[0]}T15:00:00+07:00",
      "timeZone": "Asia/Bangkok"
    }
  }
}

4. Creating task:
{
  "code": 3,
  "output": "I've added the task to your list.",
  "var": {
    "title": "Buy groceries",
    "notes": "Milk, eggs, bread",
    "due": "${tomorrow.toISOString().split('T')[0]}T23:59:59+07:00"
  }
}

When asked about tasks or events, summarize them in a clear format. For example:
"Here are your upcoming tasks:
1. Buy groceries (due tomorrow at 11:59 PM)
2. Call John (due next Monday)
..."

User message: ${message}`;

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    return Response.json({ message: text });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
