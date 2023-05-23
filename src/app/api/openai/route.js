import { NextResponse } from "next/server";

export const runtime = "edge";
export const preferredRegion = "sfo1";

export async function GET(req) {
  return NextResponse.json({
    message: `Oops, no access this way!`,
  });
}

export async function POST(req) {
  let body = await req.json();
  let callOpenAi = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      "OpenAI-Organization": process.env.OPENAI_ORG_ID,
    },
    method: "POST",
    body: JSON.stringify({
      model: "gpt-4",
      max_tokens: 400,
      temperature: 0.3,
      messages: [
        { role: "system", content: body.systemContext },
        { role: "user", content: body.speechText },
      ],
    }),
  });
  let openAiResponse = await callOpenAi.json();
  let openAiGen = openAiResponse.choices[0].message.content;
  return NextResponse.json({
    prompt: body.prompt,
    aiResponse: openAiGen,
  });
}
