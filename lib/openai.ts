import { env } from "@/lib/env";
import type { ChatMessage, MemorySession } from "@/lib/types";

type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionPayload = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string; type?: string; code?: string };
};

function buildMemoryDigest(sessions: MemorySession[]) {
  return sessions
    .flatMap((session) => session.messages.map((message) => ({
      ...message,
      sessionTitle: session.title
    })))
    .slice(-40)
    .map((message) => `[${message.sessionTitle}] ${message.role}: ${message.content}`)
    .join("\n");
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function buildMessages(params: {
  input: string;
  currentMessages: ChatMessage[];
  memoryDigest: string;
}): ChatCompletionMessage[] {
  return [
    {
      role: "system",
      content:
        "You are Recall AI, a decentralized assistant. Use the supplied long-term memories when they are relevant. Do not claim a memory exists unless it appears in the memory context."
    },
    {
      role: "system",
      content: params.memoryDigest
        ? `Long-term encrypted memory restored from Walrus/Sui:\n${params.memoryDigest}`
        : "No long-term memory has been restored for this wallet yet."
    },
    ...params.currentMessages.slice(-16).map((message) => ({
      role: message.role,
      content: message.content
    })),
    { role: "user", content: params.input }
  ];
}

async function callChatCompletions(params: {
  providerName: "OpenAI" | "Groq";
  endpoint: string;
  apiKey: string;
  model: string;
  messages: ChatCompletionMessage[];
}) {
  const response = await fetch(params.endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${params.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.7,
      messages: params.messages
    })
  });

  const payload = await readJsonResponse<ChatCompletionPayload>(response);

  if (!response.ok) {
    const apiMessage = payload?.error?.message;
    throw new Error(
      apiMessage
        ? `${params.providerName} request failed: ${apiMessage}`
        : `${params.providerName} request failed with ${response.status}`
    );
  }

  return payload?.choices?.[0]?.message?.content ?? "I could not generate a response.";
}

export async function generateAssistantReply(params: {
  input: string;
  currentMessages: ChatMessage[];
  memories: MemorySession[];
}) {
  const memoryDigest = buildMemoryDigest(params.memories);
  const messages = buildMessages({
    input: params.input,
    currentMessages: params.currentMessages,
    memoryDigest
  });

  if (env.aiProvider === "groq") {
    if (!env.groqApiKey) {
      const remembered = memoryDigest
        ? "I found prior memory for this wallet and used it as context. "
        : "I do not have prior memory for this wallet yet. ";
      return `${remembered}Set GROQ_API_KEY to enable live Groq AI responses. You said: ${params.input}`;
    }

    return await callChatCompletions({
      providerName: "Groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: env.groqApiKey,
      model: env.groqModel,
      messages
    });
  }

  if (!env.openAiApiKey) {
    const remembered = memoryDigest
      ? "I found prior memory for this wallet and used it as context. "
      : "I do not have prior memory for this wallet yet. ";
    return `${remembered}Set OPENAI_API_KEY to enable live AI responses. You said: ${params.input}`;
  }

  return await callChatCompletions({
    providerName: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKey: env.openAiApiKey,
    model: env.openAiModel,
    messages
  });
}
