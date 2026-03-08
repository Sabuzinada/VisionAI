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
    const { imageBase64, cocoResults } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    const cocoSummary = cocoResults?.length
      ? `\nCOCO-SSD already detected: ${cocoResults.map((o: any) => `${o.label} (${(o.confidence * 100).toFixed(0)}%)`).join(", ")}. Look for ADDITIONAL objects not in this list.`
      : "";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are VisionAI, an expert object detection and gesture recognition system. Your job is to identify EVERY visible object AND hand gesture in the image with high precision. You must detect objects across ALL categories including but not limited to:

- Hand gestures: thumbs up, thumbs down, peace sign / V sign, OK sign / okay gesture, pointing finger, open palm / wave, fist / closed hand, rock on / horns, shaka / hang loose, finger heart, middle finger, crossed fingers, pinching, clapping, prayer hands, finger guns, number signs (1-5), stop hand, beckoning, salute
- Electronics: phones, laptops, tablets, monitors, keyboards, mice, headphones, speakers, game controllers (PlayStation, Xbox, Nintendo), remotes, cameras, chargers, cables, USB drives
- Eyewear: glasses, sunglasses, reading glasses, safety goggles
- Musical instruments: guitars (acoustic, electric, bass), pianos, keyboards, drums, violins, ukuleles, microphones, amplifiers, picks, capos, tuners
- Clothing & accessories: hats, caps, watches, bracelets, necklaces, rings, earrings, belts, scarves, ties, bags, backpacks, wallets, shoes, boots, sneakers
- Furniture: chairs, tables, desks, shelves, lamps, monitors stands, couch, bed, pillow, blanket, curtain
- Kitchen items: cups, mugs, plates, bowls, utensils, bottles, cans, jars, pots, pans, toasters, blenders
- Office supplies: pens, pencils, notebooks, sticky notes, staplers, scissors, tape, paper
- Toys & games: stuffed animals, teddy bears, action figures, board games, cards, dice, puzzles
- Sports: balls, bats, rackets, weights, yoga mats, water bottles
- Personal care: toothbrush, comb, brush, mirror, makeup, lotion
- Plants & nature: flowers, potted plants, succulents, vases
- Food & drinks: fruits, snacks, beverages, containers
- Decorations: posters, frames, artwork, clocks, candles, figurines
- Pets & animals: cats, dogs, birds, fish tanks
- Vehicles & parts: cars, bikes, helmets, keys

IMPORTANT: Pay special attention to HAND GESTURES. If you see any hands in the image, always identify what gesture they are making. Common gestures include: thumbs up, peace sign, OK sign, pointing, open palm, fist, rock on, shaka, and finger counting. For the gesture category, use "gesture" as the category value.

Return a JSON object. Be thorough - identify EVERY visible object and gesture no matter how small.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Identify ALL objects visible in this image. Be extremely thorough - detect every item you can see, including small or partially visible objects.${cocoSummary}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "detected_objects",
            strict: true,
            schema: {
              type: "object",
              properties: {
                objects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: {
                        type: "string",
                        description: "Specific object name, e.g. 'PlayStation controller', 'acoustic guitar', 'reading glasses'",
                      },
                      confidence: {
                        type: "number",
                        description: "Confidence score between 0 and 1",
                      },
                      category: {
                        type: "string",
                        description: "Category like gesture, electronics, eyewear, instrument, clothing, furniture, kitchen, office, toy, sports, decoration, food, animal, vehicle, other",
                      },
                      description: {
                        type: "string",
                        description: "Brief description of the object appearance or state",
                      },
                    },
                    required: ["label", "confidence", "category", "description"],
                    additionalProperties: false,
                  },
                },
                scene_summary: {
                  type: "string",
                  description: "A 1-2 sentence summary of the overall scene",
                },
                total_objects: {
                  type: "number",
                  description: "Total number of objects detected",
                },
              },
              required: ["objects", "scene_summary", "total_objects"],
              additionalProperties: false,
            },
          },
        },
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      return res.status(response.status).json({ error: "OpenAI API error", details: errorData });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;

    if (parsed && parsed.objects) {
      return res.status(200).json({
        objects: parsed.objects,
        sceneSummary: parsed.scene_summary,
        totalObjects: parsed.total_objects,
      });
    }

    return res.status(200).json({ objects: [], sceneSummary: "Unable to analyze image.", totalObjects: 0 });
  } catch (err: any) {
    console.error("Vision detection error:", err);
    return res.status(500).json({ error: "Vision analysis failed", message: err.message });
  }
}
