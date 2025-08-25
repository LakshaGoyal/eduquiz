import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Read from environment (secure on Render/Vercel/Railway)
// 🔑 Replace fallback with your Gemini API key for local testing
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDxuHN1IJTkoMgOKDeVR_KLLJzwGSg8M2o";

// ✅ Use a valid model + endpoint
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Quiz generation endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const prompt = req.body.prompt || "";

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Generate 5 multiple-choice questions and 5 true/false questions 
                       with answers from the following study material. 
                       Format clearly with numbering:\n\n${prompt}`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    console.log("🔎 Gemini API response:", JSON.stringify(data, null, 2));

    res.json(data);
  } catch (err) {
    console.error("❌ Backend error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);



//AIzaSyB2paGTlZAAxo1s4QufFLiyAGRsFvEHwQA
