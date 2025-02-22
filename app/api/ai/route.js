const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_GEN_AI_KEY);

export async function POST(request) {
    try {
        const body = await request.json();
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Format the context data into a readable format
        const contextString = formatContextData(body.context);
        
        // Create the chat
        const chat = model.startChat({
            history: body.history,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        // Add context to the user's message
        const message = `
        Context about your data:
        ${contextString}

        User's question: ${body.message}`;

        const result = await chat.sendMessage(message);
        const response = await result.response;
        
        return new Response(JSON.stringify({ message: response.text() }), { status: 200 });
    } catch (error) {
        console.error('Error in AI route:', error);
        return new Response(JSON.stringify({ message: 'Failed to process request' }), { status: 500 });
    }
}

function formatContextData(context) {
    if (!context) return "No context available.";

    let formattedString = "";

    // Format unread emails
    if (context.unreadEmails && context.unreadEmails.length > 0) {
        formattedString += "Unread Emails:\n";
        context.unreadEmails.forEach((email, index) => {
            formattedString += `${index + 1}. Subject: ${email.subject || 'No Subject'}\n   From: ${email.from}\n   Preview: ${email.snippet}\n\n`;
        });
    } else {
        formattedString += "No unread emails.\n\n";
    }

    // Format upcoming events
    if (context.upcomingEvents && context.upcomingEvents.length > 0) {
        formattedString += "Upcoming Calendar Events:\n";
        context.upcomingEvents.forEach((event, index) => {
            formattedString += `${index + 1}. ${event.summary || 'Untitled Event'}\n   Start: ${event.start}\n   End: ${event.end}\n\n`;
        });
    } else {
        formattedString += "No upcoming events.\n";
    }

    return formattedString;
}
