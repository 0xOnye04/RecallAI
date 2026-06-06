export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type MemorySession = {
  id: string;
  walletAddress: string;
  title: string;
  messages: ChatMessage[];
  blobId?: string;
  suiReferenceId?: string;
  suiReferenceProvider?: "sui" | "local";
  suiTransactionDigest?: string;
  storageProvider?: "walrus" | "local-walrus";
  createdAt: string;
  updatedAt: string;
};

export type MemoryReference = {
  sessionId: string;
  walletAddress: string;
  title: string;
  blobId: string;
  suiReferenceId?: string;
  suiReferenceProvider?: "sui" | "local";
  suiTransactionDigest?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  walletAddress: string;
  issuedAt: string;
  tatumVerified: boolean;
  recentTransactionCount?: number;
};
