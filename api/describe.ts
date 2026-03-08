import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  try {
    const { objects, imageBase64 } = req.body;

    const objectList = objects
      .map((o: any) => `${o.label} (${(o.confidence * 100).toFixed(1)}% confidence)`)
      .join(", ");

    const messages: any[] = [
      {
        role: "system",
        content: `You are VisionAI, an expert computer vision analyst. Given a list of detected objects (and optionally an image), provide a concise, insightful description of the scene. Include:
1. A brief scene summary (1-2 sentences)
2. Key observations about the objects and their relationships
3. Possible context or activity happening in the scene
Keep the response under 150 words. Be specific and analytical.`,
      },
    ];

    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Detected objects: ${objectList}\n\nPlease analyze this image and the detected objects to describe the scene.`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: "low",
            },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Detected objects: ${objectList}\n\nPlease describe the scene based on these detected objects.`,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: "OpenAI API error", details: errorData });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const description =
      typeof content === "string"
        ? content
        : "Unable to generate description.";

    return res.status(200).json({ description });
  } catch (err: any) {
    console.error("Describe error:", err);
    return res.status(500).json({
      description: `Scene analysis temporarily unavailable.`,
    });
  }
}
