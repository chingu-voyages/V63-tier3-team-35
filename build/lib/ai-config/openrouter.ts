import OpenAI from "openai";

const shared = {
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000",
    "X-OpenRouter-Title": process.env.SITE_NAME ?? "My App",
  },
};

// use=chat -> /api/v1/chat/completions
export const chatClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  ...shared,
});

// use=decision -> /api/alpha/decisions
export const decisionsClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/alpha",
  ...shared,
});

export const CHAT_MODEL =
  process.env.OPENROUTER_CHAT_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b:free";

export const DECISION_MODEL =
  process.env.OPENROUTER_DECISION_MODEL ?? "perplexity/pplx-decider-v1.3:free";

// Used when a decision request doesn't bring its own questions
export const DEFAULT_QUESTIONS = {
  sentiment: {
    type: "choice",
    instructions: "What is the overall tone of the text?",
    criteria: {
      positive: "Happy, grateful or enthusiastic.",
      neutral: "Factual or without strong emotion.",
      negative: "Frustrated, angry or disappointed.",
    },
  },
  urgency: {
    type: "score",
    instructions: "How urgent is this text?",
    criteria: ["Not urgent", "Somewhat urgent", "Very urgent"], // lowest first
  },
  needs_human: {
    type: "noul",
    instructions: "Should a human review this?",
    criteria: {
      true: "It needs a person's judgement.",
      false: "It can be handled automatically.",
    },
  },
};
