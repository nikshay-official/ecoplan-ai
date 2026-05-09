import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    console.log("=== CHAT API HIT ===");
    console.log("API KEY EXISTS:", !!apiKey);
    console.log("API KEY:", apiKey?.slice(0, 15));

    if (!apiKey) {
      return NextResponse.json({
        reply: "❌ No API key found. Add GROQ_API_KEY to .env.local and restart.",
      });
    }

    const groq = new Groq({ apiKey });
    const { message, pollutionContext } = await req.json();

    const systemPrompt = `You are EcoPlan AI, an expert environmental planning assistant.
Live city data:
- City: ${pollutionContext?.city || "New Delhi"}
- AQI: ${pollutionContext?.aqi || 274}
- CO2: ${pollutionContext?.co2 || 430} ppm
- PM2.5: ${pollutionContext?.pm25 || 168} μg/m³
- Pollution Score: ${pollutionContext?.score || 78}/100
- Improvement So Far: ${pollutionContext?.improved || 0}%
- Objects Placed: ${pollutionContext?.placedObjects || 0}

You help city planners place green infrastructure.
Objects available: Tree (12% reduction), Park (22%), Garden (15%), Lake (18%), Solar Panel (8%), EV Hub (10%), Green Wall (9%), Wind Turbine (13%).

Rules:
- Max 3 sentences, be specific and use the live numbers above
- Use emojis for impact
- If AQI over 200 treat as emergency
- Never claim to be GPT or any other AI`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 200,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Sorry, I could not process that.";

    console.log("✅ SUCCESS:", reply.slice(0, 50));
    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("❌ GROQ ERROR:", error?.message);
    console.error("STATUS:", error?.status);

    return NextResponse.json({
      reply: `❌ Error: ${error?.message || "Unknown error"} (Status: ${error?.status || "none"})`,
    });
  }
}