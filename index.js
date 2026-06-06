import { Ollama } from "@langchain/ollama";
import express from "express";
import "dotenv/config"; // Safely imports your secret environment variables

const app = express();

// Use the PORT variable from our .env file, or fallback to 3000 if not found
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// Dynamically connect to the AI using the variables defined in your .env file
const model = new Ollama({
  baseUrl: process.env.AI_BASE_URL,
  model: process.env.AI_MODEL,
  temperature: 0.3, 
});

// The backend gateway streaming route
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;
  
  if (!userMessage) {
    return res.status(400).send("No message provided");
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    const stream = await model.stream(userMessage);
    
    for await (const chunk of stream) {
      res.write(chunk); 
    }
    res.end(); 
  } catch (error) {
    console.error("Streaming failed:", error.message);
    res.status(500).end("Failed to connect to AI instance.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Production Web Server Booted!`);
  console.log(`👉 Accessing model: ${process.env.AI_MODEL}`);
  console.log(`👉 Running live at: http://localhost:${PORT}`);
});