import { ChatGroq } from "@langchain/groq";

// Initialize our model globally to optimize cloud speed
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  modelName: "llama-3.3-70b-versatile",
  temperature: 0.3,
});

export default async function handler(req, res) {
  // Only accept POST requests from our user interface
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).send("No message provided");
  }

  // Set the streaming headers natively
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    const stream = await model.stream(userMessage);
    for await (const chunk of stream) {
      res.write(chunk.content || "");
    }
    res.end();
  } catch (error) {
    console.error("Cloud streaming crash:", error.message);
    res.status(500).end("Failed to connect to cloud AI instance.");
  }
}