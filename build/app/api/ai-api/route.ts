import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  chatClient,
  decisionsClient,
  CHAT_MODEL,
  DECISION_MODEL,
  DEFAULT_QUESTIONS,
} from "@/lib/ai-config/openrouter";

type Use = "decision" | "chat";

type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam & {
  reasoning_details?: unknown;
};

type Payload = {
  input?: string;
  model?: string;
  // chat
  messages?: ChatMessage[];
  reasoning?: boolean;
  // decision
  state?: unknown; // string, object, or array incl. { type: "image_url", ... }
  questions?: Record<string, unknown>;
};

function getUse(req: NextRequest): Use | null {
  const use = req.nextUrl.searchParams.get("use") ?? "decision"; // default
  return use === "decision" || use === "chat" ? use : null;
}

async function runChat(p: Payload) {
  const messages: ChatMessage[] = p.messages ?? [
    { role: "user", content: p.input as string },
  ];

  // `reasoning` is an OpenRouter extension, so it isn't in the OpenAI types.
  // Passing it through a variable avoids the excess-property check.
  const params = {
    model: p.model || CHAT_MODEL,
    messages,
    reasoning: { enabled: p.reasoning ?? true },
  };

  const completion = await chatClient.chat.completions.create(params);

  const message = completion.choices[0]
    .message as (typeof completion.choices)[0]["message"] & {
    reasoning_details?: unknown;
  };

  return {
    use: "chat" as const,
    model: completion.model,
    output: message.content,
    // Send this back unmodified inside `messages` to continue the reasoning
    assistant_message: {
      role: "assistant",
      content: message.content,
      reasoning_details: message.reasoning_details,
    },
    usage: completion.usage,
  };
}

async function runDecision(p: Payload) {
  const data = await decisionsClient.post("/decisions", {
    body: {
      model: p.model || DECISION_MODEL,
      state: p.state ?? p.input,
      questions: p.questions ?? DEFAULT_QUESTIONS,
    },
  });
  return { use: "decision" as const, ...(data as object) };
}

function handleError(err: unknown) {
  const status =
    typeof err === "object" && err && "status" in err
      ? Number((err as { status: number }).status) || 500
      : 500;
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: message }, { status });
}

function validate(use: Use, p: Payload): string | null {
  if (use === "chat") {
    const hasInput = typeof p.input === "string" && p.input.trim();
    const hasMessages = Array.isArray(p.messages) && p.messages.length > 0;
    if (!hasInput && !hasMessages)
      return "`input` or `messages` is required for use=chat";
  } else {
    const hasInput = typeof p.input === "string" && p.input.trim();
    if (!hasInput && p.state == null)
      return "`input` or `state` is required for use=decision";
  }
  return null;
}

async function handle(use: Use, p: Payload) {
  const problem = validate(use, p);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  return NextResponse.json(
    use === "chat" ? await runChat(p) : await runDecision(p),
  );
}

// POST /api/ai-api?use=decision|chat
export async function POST(req: NextRequest) {
  try {
    const use = getUse(req);
    if (!use) {
      return NextResponse.json(
        { error: "`use` must be 'decision' or 'chat'" },
        { status: 400 },
      );
    }
    return await handle(use, (await req.json()) as Payload);
  } catch (err) {
    return handleError(err);
  }
}

// GET /api/ai-api?use=decision|chat&q=...&model=...
export async function GET(req: NextRequest) {
  try {
    const use = getUse(req);
    if (!use) {
      return NextResponse.json(
        { error: "`use` must be 'decision' or 'chat'" },
        { status: 400 },
      );
    }
    const sp = req.nextUrl.searchParams;
    return await handle(use, {
      input: sp.get("q") ?? undefined,
      model: sp.get("model") ?? undefined,
    });
  } catch (err) {
    return handleError(err);
  }
}
