import { ChatGroq } from "@langchain/groq";
import express from "express";
import "dotenv/config"; 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// Connect to Groq's high-speed cloud infrastructure
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  modelName: "llama-3.3-70b-versatile",
  temperature: 0.3,
});

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) return res.status(400).send("No message provided");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    const stream = await model.stream(userMessage);
    for await (const chunk of stream) {
      res.write(chunk.content || ""); 
    }
    res.end(); 
  } catch (error) {
    console.error("Cloud streaming failed:", error.message);
    res.status(500).end("Failed to connect to cloud AI instance.");
  }
});

// Production requirement: Only listen to explicit ports when running outside of serverless clouds
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally at: http://localhost:${PORT}`);
  });
}

// Export the app module cleanly so Vercel can run it as a serverless function
export default app;