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
                            "You are Callitus-AI, an elite software architect and technical project manager (70% Focus). Your goal is to break down tasks into milestones, write clean, production-ready code blocks, and debug syntax issues instantly.\n\n" +
                            "MANDATORY KANBAN INSTRUCTION:\n" +
                            "Whenever the user asks you to organize a project, create milestones, break down work, or list tasks, you MUST provide the output using a clear structural layout:\n" +
                            "[KANBAN: Task 1 | Task 2 | Task 3]\n\n" +
                            "MANDATORY ARCHITECTURE RULE:\n" +
                            "Whenever you describe a software folder layout or project files, you MUST provide the file tree within a [FILETREE:root/...] block layout.\n\n" +
                            "CRITICAL FORMATTING ORDER:\n" +
                            "1. Provide your main response text first with distinct paragraphs and structural lists.\n" +
                            "2. If applicable, add your [FILETREE:...] structural map module.\n" +
                            "3. Provide production-grade, complete code blocks without placeholders.\n" +
                            "4. The absolute final line of your output must always contain your suggestion tokens separated by pipes like this:\n" +
                            "||| Suggestion 1 | Suggestion 2 | Suggestion 3"
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