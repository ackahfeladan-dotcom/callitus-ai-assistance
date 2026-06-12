import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";

export const config = {
  runtime: 'edge',  
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

 try {
        // 1. Receive data from frontend
        const { message, history } = await req.json();
        if (!message) {
            return new Response("No message provided", { status: 400 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // 2. Setup the high-speed AI engine
                    const model = new ChatGroq({
                        apiKey: process.env.GROQ_API_KEY,
                        modelName: "llama-3.3-70b-versatile",
                        temperature: 0.2
                    });

                    // 3. Construct your pro-level system layout and historical flow
                    const formattedMessages = [
           
 new SystemMessage(
    "You are Callitus-AI, an elite software architect and expert developer.\n\n" +
    "1. DYNAMIC RESPONSE MODES:\n" +
    "   - CHAT GREETING: If the user says a basic hello like 'hi', greet them warmly, ask what high-level system they want to build, and suggest 3 advanced development paths or cutting-edge features they could implement.\n" +
    "   - PRO LEVEL CODING: When the user asks for code, NEVER generate basic, entry-level, or partial examples. Write fully realized, enterprise-grade, deep solutions. Include proper error boundary checking, state handling, optimal performance patterns, and clean architecture.\n\n" +
    "2. FORMATTING REQUIREMENT: Always wrap your source code blocks completely inside clean markdown code fences using triple backticks like javascript or python."
                        ),
                        ...(history || []).map(msg => msg.role === 'user' ? new HumanMessage(msg.text) : new AIMessage(msg.text)),
                        new HumanMessage(message)
                    ];

                    // 4. Stream active response tokens right into the stream pipeline
                    const tokenStream = await model.stream(formattedMessages);
                    for await (const chunk of tokenStream) {
                        if (chunk.content) {
                            controller.enqueue(encoder.encode(chunk.content));
                        }
                    }
                    controller.close();
                } catch (streamError) {
                    console.error("Stream reader loop error:", streamError);
                    controller.error(streamError);
                }
            }
        });

        // 5. Respond with live text-stream headers
        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        });

    } catch (globalError) {
        console.error("Global edge route error:", globalError);
        return new Response(JSON.stringify({ error: globalError.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}