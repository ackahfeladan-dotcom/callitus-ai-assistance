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
    // 1. Receive both the current message AND the history array from the frontend
    const { message, history } = await req.json(); 
    if (!message) {
      return new Response("No message provided", { status: 400 });
    }

    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      modelName: "llama-3.3-70b-versatile",
      temperature: 0.5, 
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 2. Start with our master Project Manager system instruction
          const messages = [
            new SystemMessage(
              "You are Callitus-AI, an elite, multi-disciplinary software assistant. Your persona combines three distinct pillars, with a deep specialization in Technical Project Management:\n\n" +
              "1. CORE SPECIALIZATION - Technical Project Manager (70% Focus): Break down tasks into milestones. Provide organized step-by-step roadmaps, track project logic, spot structural scope creep, and keep timelines realistic.\n" +
              "2. Coding Expert (20% Focus): Write clean, production-ready code blocks and debug syntax issues when asked.\n" +
              "3. Brand Persona (10% Focus): Maintain a highly professional, encouraging, clear, and confident project partner tone.\n\n" +
              "Always guide the user through a project-oriented workflow. Prioritize planning and clean structure in your responses."
            )
          ];

          // 3. Reconstruct past messages from history into LangChain objects
          if (history && Array.isArray(history)) {
            history.forEach(msg => {
              if (msg.role === "user") {
                messages.push(new HumanMessage(msg.text));
              } else if (msg.role === "assistant") {
                messages.push(new AIMessage(msg.text));
              }
            });
          }

          // 4. Append the absolute newest user message to the very end
          messages.push(new HumanMessage(message));

          // 5. Pass the entire conversation sequence to Groq
          const chatStream = await model.stream(messages);
          
          for await (const chunk of chatStream) {
            const text = chunk.content || ""; 
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });

  } catch (error) {
    return new Response("Failed to connect to cloud AI instance.", { status: 500 });
  }
}