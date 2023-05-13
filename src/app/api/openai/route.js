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
  let callOpenAi = await fetch("https://api.openai.com/v1/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      "OpenAI-Organization": process.env.OPENAI_ORG_ID,
    },
    method: "POST",
    body: JSON.stringify({
      model: "text-davinci-003",
      max_tokens: 2000,
      temperature: 0.7,
      prompt: body.prompt,
    }),
  });
  let openAiResponse = await callOpenAi.json();
  let openAiGen = openAiResponse.choices[0].text;
  return NextResponse.json({
    prompt: `Prompt I sent is ${body.prompt}`,
    aiResponse: openAiGen,
  });
}
