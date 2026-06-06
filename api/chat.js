import { ChatGroq } from "@langchain/groq";

export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { message } = await req.json(); 
    if (!message) {
      return new Response("No message provided", { status: 400 });
    }

    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      modelName: "llama-3.3-70b-versatile",
      temperature: 0.3,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chatStream = await model.stream(message);
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