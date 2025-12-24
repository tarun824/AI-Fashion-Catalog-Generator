import { workerData, parentPort } from "worker_threads";
import OpenAI from "openai";

const {
  apiKey,
  imageBase64,
  prompt,
  model = "gpt-4o-mini",
  descriptionPrompt = "Generate a concise description of this garment.",
} = workerData;

const openai = new OpenAI({
  apiKey,
});

const toDataUrl = (base64) =>
  base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;

const run = async () => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: descriptionPrompt,
          },
          {
            type: "image_url",
            image_url: {
              url: toDataUrl(imageBase64),
            },
          },
        ],
      },
    ],
    max_tokens: 800,
  });

  const content = response.choices?.[0]?.message?.content;
  const description = Array.isArray(content)
    ? content
        .map((chunk) => chunk.text ?? chunk)
        .join("\n")
        .trim()
    : (content ?? "").trim();

  parentPort.postMessage({
    description,
    tokens: response.usage?.total_tokens ?? null,
  });
};

run().catch((error) => {
  parentPort.postMessage({
    error: error.message ?? "Failed to process image",
  });
});
