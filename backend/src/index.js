import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "https://ai-fashion-catalog-generator-tfec.vercel.app",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);
app.use(
  express.json({
    limit: "10mb",
  })
);
app.use(
  morgan("dev", {
    skip: (req) => req.path === "/health",
  })
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are a Senior E-commerce Fashion Specialist. 
Analyze the garment image and generate a product listing in the EXACT following format:

Name: [Create a catchy, descriptive product name]

Description (4 lines):
- Line 1: Describe the primary fabric, pattern, and main design feature.
- Line 2: Detail the specific accents (like borders, zari, or textures).
- Line 3: Mention the fit, drape, or how it feels to wear.
- Line 4: Suggest the best occasions or the overall style value.

Use elegant, inviting language suitable for a high-end e-commerce website.
`.trim();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/generate-description", async (req, res) => {
  const { imageBase64 } = req.body || {};
  console.log("imageBase64");
  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required" });
  }
  const dataUrl = `data:image/png;base64,${imageBase64}`;

  try {
    // const response = await openai.responses.create({
    //   model: "gpt-4o",
    //   input: [
    //     {
    //       role: "system",
    //       content: [
    //         {
    //           type: "input_text",
    //           text: SYSTEM_PROMPT,
    //         },
    //       ],
    //     },
    //     {
    //       role: "user",
    //       content: [
    //         {
    //           type: "input_text",
    //           text: "Review this garment image and fill every bullet. Favor exact fashion terminology.",
    //         },
    //         {
    //           type: "input_image",
    //           image_base64: imageBase64,
    //         },
    //       ],
    //     },
    //   ],
    //   temperature: 0.2,
    // });
    const dataUrl = `data:image/png;base64,${imageBase64}`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 4096,
    });
    console.log("response", response);
    // const textChunks =
    //   response.output
    //     ?.map((block) =>
    //       block.content
    //         ?.map((item) =>
    //           item.type === "output_text" && item.text ? item.text : ""
    //         )
    //         .join("")
    //     )
    //     .filter(Boolean) ?? [];

    const description = response?.choices?.[0]?.message?.content;

    if (!description) {
      return res
        .status(502)
        .json({ error: "No description returned from model." });
    }

    res.json({ description });
  } catch (error) {
    console.error("OpenAI error", error);
    res.status(500).json({
      error: "Unable to generate description. Please try again.",
    });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
