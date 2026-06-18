import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

export const config = {
  runtime: 'edge',
};

// 1. Independent Web Search Function
async function searchWeb(query) {
  try {
    const response = await fetch("https://tavily.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: query,
        max_results: 3
      })
    });
    const data = await response.json();
    return data.results.map(r => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join("\n---\n");
  } catch (e) {
    return "Search failed.";
  }
}

// 2. Tool Schema Configuration
const searchToolSchema = {
  name: "search_web",
  description: "Look up real-time information or current events on the internet.",
  schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The search query." }
    },
    required: ["query"]
  }
};

// 3. Main Handler Function
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // Receive data from frontend (including your history array)
    const { message, history } = await req.json();
    if (!message) {
      return new Response("No message provided", { status: 400 });
    }

    const encoder = new TextEncoder();
    const fullHistory = history || [];
    
    // Your exact history truncation logic
    const recentMessages = fullHistory.slice(-4);
    const mappedRecentMessages = recentMessages.map(msg => 
      msg.role === 'user' ? new HumanMessage(msg.text) : new AIMessage(msg.text)
    );

    // Your exact custom system instructions
    const systemPromptText = 
      "You are Callitus-AI, an elite software architect assistant.\n\n" +
      "1. DYNAMIC RESPONSE MODES:\n" +
      "   - CHAT GREETING: If the user says a basic hello like 'hi', greet them warmly.\n" +
      "   - PRO LEVEL CODING: When asked for code, NEVER generate basic or partial examples.\n" +
      "2. FORMATTING: Wrap source code completely inside markdown triple backticks.";

    // Assemble the optimized array matching your exact UI variables
    const formattedMessages = [
      new SystemMessage(systemPromptText),
      ...mappedRecentMessages,
      new HumanMessage(message)
    ];

    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      modelName: "llama-3.3-70b-versatile",
      temperature: 0.2,
    }).bindTools([searchToolSchema]);

    // Check if the AI wants to use the search tool
    const initialResponse = await model.invoke(formattedMessages);

    if (initialResponse.tool_calls && initialResponse.tool_calls.length > 0) {
      const toolCall = initialResponse.tool_calls[0];
      const searchResult = await searchWeb(toolCall.args.query);

      formattedMessages.push(initialResponse);
      formattedMessages.push(new ToolMessage({
        tool_call_id: toolCall.id,
        name: toolCall.name,
        content: searchResult
      }));
    }

    // Stream active response tokens right into the pipeline
    const stream = new ReadableStream({
      async start(controller) {
        try {
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

    // Respond with live text-stream headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}