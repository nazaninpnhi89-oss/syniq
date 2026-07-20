import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getGroqClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY!,
    });
  }
  return _client;
}
