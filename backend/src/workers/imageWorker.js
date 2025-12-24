import { parentPort, workerData } from "worker_threads";
import OpenAI from "openai";

const client = workerData.apiKey
  ? new OpenAI({ apiKey: workerData.apiKey })
  : null;

const defaultModel = workerData.defaultModel || "gpt-4o-mini";

const buildDataUrl = (base64, mimeType = "image/png") => {
  if (!base64) {
    return "";
  }

  if (base64.startsWith("data:")) {
    return base64;
  }

  return `data:${mimeType};base64,${base64}`;
};

const formatDescription = (content) => {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((chunk) =>
        typeof chunk === "string"
          ? chunk
          : chunk?.text ?? chunk?.content ?? "",
      )
      .join("\n")
      .trim();
  }

  return "";
};

parentPort.on("message", async ({ taskId, payload }) => {
  if (!client) {
    parentPort.postMessage({
      taskId,
      status: "error",
      error: { message: "OpenAI API key is not configured" },
    });
    return;
  }

  try {
    const response = await client.chat.completions.create({
      model: payload.model || defaultModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: payload.systemPrompt },
            {
              type: "image_url",
              image_url: { url: buildDataUrl(payload.imageBase64, payload.mimeType) },
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const description = formatDescription(
      response?.choices?.[0]?.message?.content,
    );

    parentPort.postMessage({
      taskId,
      status: "success",
      result: {
        description,
      },
    });
  } catch (error) {
    parentPort.postMessage({
      taskId,
      status: "error",
      error: {
        message: error?.message || "Failed to generate description",
        detail: error?.response?.data,
      },
    });
  }
});

