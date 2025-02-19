const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEN_AI_KEY);

export async function POST(request) {
    try {
        const body = await request.json();

        const model = genAI.getGenerativeModel({ model: "gemini-pro"})
        const chat = model.startChat({
            history: body.history
        })
        const message = body.message

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return new Response(JSON.stringify({ message: text }), { status: 200 });

    } catch (error) {
        console.error("Error handling POST request:", error);
        return new Response(JSON.stringify({ message: "Unable to carry out a response due to explicit content." }), { status: 500 });
    }
}
