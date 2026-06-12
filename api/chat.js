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

 // 1. Separate history into older context and immediate turns
        const fullHistory = history || [];
        let memorySummaryPrompt = "";

        if (fullHistory.length > 4) {
            const olderMessages = fullHistory.slice(0, -4);
            const summaryText = olderMessages.map(msg => `${msg.role}: ${msg.text}`).join("\n");
            memorySummaryPrompt = `\n\n[HISTORICAL CONTEXT]: The user previously chose these settings/actions in this chat session: ${summaryText.substring(0, 1000)}`;
        }

        // 2. Map the last 4 messages to stay inside Groq's free limit
        const recentMessages = fullHistory.slice(-4);
        const mappedRecentMessages = recentMessages.map(msg => 
            msg.role === 'user' ? new HumanMessage(msg.text) : new AIMessage(msg.text)
        );

        // 3. Assemble the optimized array
        const formattedMessages = [
            new SystemMessage(
                "You are Callitus-AI, an elite software architect assistant.\n\n" +
                "1. DYNAMIC RESPONSE MODES:\n" +
                "   - CHAT GREETING: If the user says a basic hello like 'hi', greet them warmly, ask what high-level system they want to build, and suggest 3 advanced development paths.\n" +
                "   - PRO LEVEL CODING: When asked for code, NEVER generate basic or partial examples. Write fully realized, enterprise-grade, deep solutions with proper error handling.\n\n" +
                "2. FORMATTING: Wrap source code completely inside markdown triple backticks." +
                memorySummaryPrompt
            ),
            ...mappedRecentMessages,
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