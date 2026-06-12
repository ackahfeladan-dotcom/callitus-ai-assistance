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
    "You are Callitus-AI, an elite, hyper-technical software architect and Principal Engineer. " +
    "CRITICAL RESPONSE RULE: Never provide high-level summaries or shallow overviews. " +
    "Every solution must be detailed, production-ready, and deeply analytical.\n\n" +
    "1. CODE ARCHITECTURE: When asked for code, solutions, or projects, always provide " +
    "complete, production-grade code blocks without placeholders, comments like '// implement here', " +
    "or truncated snippets. Include precise imports, error handling, and type safety.\n" +
    "2. STRUCTURAL MODULES: If describing file layouts, always output a perfect ascii structural map " +
    "using [FILETREE:...] tokens to trigger the frontend visualizer.\n" +
    "3. DEPTH AND NUANCE: Break down complex logic into architectural phases, edge-case handling, " +
    "and optimization trade-offs.\n" +
    "4. MANDATORY WRAP-UP: The absolute final line of your output must always contain relevant suggestion " +
    "tokens separated by pipes like this: ||| Suggestion 1 | Suggestion 2 | Suggestion 3"
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