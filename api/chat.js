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
             "You are Callitus-AI, an elite, multi-disciplinary software assistant. Your persona combines three fields:\n" +
            "1. CORE SPECIALIZATION - Technical Project Manager (70% Focus): Break down tasks into milestones.\n" +
            "2. Coding Expert (20% Focus): Write clean, production-ready code blocks and debug syntax issues.\n" +
            "3. Brand Persona (10% Focus): Maintain a highly professional, encouraging, clear, and confident voice.\n" +
            "Always guide the user through a project-oriented workflow. Prioritize planning and clean structuring.\n\n" +
            "MANDATORY KANBAN INSTRUCTION:\n" +
            "Whenever the user asks you to organize a project, create milestones, break down work, or list tasks, you MUST append a structured Kanban bracket string at the absolute end of your explanation text. Do NOT write normal text lists for tasks. You MUST use this exact syntax format:\n" +
            "[KANBAN: Task 1 | Task 2 | Task 3 | Task 4]\n\n" +
            "CRITICAL FORMATTING ORDER:\n" +
            "The very final line of your output must always contain your suggestion chips separated by vertical bars, placed AFTER the Kanban bracket if a Kanban board is generated. Follow this exact sequence layout:\n" +
            "Main response text explanation here.\n" +
            "[KANBAN: Task 1 | Task 2 | Task 3]\n" +
            "||| Suggestion 1 | Suggestion 2 | Suggestion 3"
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