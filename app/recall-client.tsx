"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  DAppKitProvider,
  useCurrentAccount,
  useDAppKit,
  useWallets
} from "@mysten/dapp-kit-react";
import {
  Brain,
  CheckCircle2,
  Database,
  Loader2,
  LogOut,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Wallet
} from "lucide-react";
import { dAppKit } from "@/app/dapp-kit";
import type { AuthSession, ChatMessage, MemorySession } from "@/lib/types";

type SuiStatus = {
  provider: string;
  network: string;
  checkpoint: string;
};

type WalrusStatus = {
  provider: string;
  publisherConfigured: boolean;
  aggregatorConfigured: boolean;
  publisherUrl: string | null;
  aggregatorUrl: string | null;
};

function formatShortAddress(address: string) {
  if (address.length < 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatStorageProvider(session: MemorySession) {
  if (session.storageProvider === "walrus" || (session.blobId && !session.blobId.startsWith("local-walrus-"))) {
    return "Walrus";
  }

  return "Legacy local dev";
}

async function readApiJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function RecallApp() {
  const currentAccount = useCurrentAccount();
  const suiKit = useDAppKit();
  const wallets = useWallets();
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [sessions, setSessions] = useState<MemorySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [suiStatus, setSuiStatus] = useState<SuiStatus | null>(null);
  const [walrusStatus, setWalrusStatus] = useState<WalrusStatus | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const walletAddress = currentAccount?.address;

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions]
  );
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, isSending]);

  useEffect(() => {
    window.localStorage.removeItem("slush:session");
    window.localStorage.removeItem("mysten-dapp-kit:selected-wallet-and-address");
    window.localStorage.removeItem("recall-ai:sui-wallet");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInfrastructureStatus() {
      try {
        const [suiResponse, walrusResponse] = await Promise.all([
          fetch("/api/sui/status"),
          fetch("/api/walrus/status")
        ]);
        const suiPayload = await readApiJson<SuiStatus & { error?: string }>(suiResponse);
        const walrusPayload = await readApiJson<WalrusStatus & { error?: string }>(walrusResponse);
        if (!cancelled && suiResponse.ok && suiPayload && !suiPayload.error) setSuiStatus(suiPayload);
        if (!cancelled && walrusResponse.ok && walrusPayload && !walrusPayload.error) setWalrusStatus(walrusPayload);
      } catch {
        if (!cancelled) {
          setSuiStatus(null);
          setWalrusStatus(null);
        }
      }
    }

    loadInfrastructureStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setAuth(null);
      setSessions([]);
      setActiveSessionId(undefined);
      setInput("");
      setError("");
      return;
    }

    if (auth?.walletAddress === walletAddress) return;

    let cancelled = false;
    const connectedAddress = walletAddress;

    async function authenticateWallet() {
      setIsSigningIn(true);
      setError("");

      try {
        const message = `Recall AI login ${new Date().toISOString()}`;
        let signature = "";

        try {
          const signed = await suiKit.signPersonalMessage({
            message: new TextEncoder().encode(message)
          });
          signature = signed.signature;
        } catch {
          signature = "";
        }

        const response = await fetch("/api/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ walletAddress: connectedAddress, signature, message })
        });
        const session = await readApiJson<AuthSession & { error?: string }>(response);
        if (!response.ok) throw new Error(session?.error ?? `Wallet auth failed with ${response.status}`);
        if (!session) throw new Error("Wallet auth returned an empty response");
        if (cancelled) return;

        setAuth(session);
        await loadMemory(connectedAddress, cancelled);
      } catch (connectError) {
        if (!cancelled) {
          setError(connectError instanceof Error ? connectError.message : "Wallet connection failed");
        }
      } finally {
        if (!cancelled) setIsSigningIn(false);
      }
    }

    authenticateWallet();

    return () => {
      cancelled = true;
    };
  }, [auth?.walletAddress, suiKit, walletAddress]);

  async function loadMemory(address: string, cancelled = false) {
    setIsLoadingMemory(true);
    setError("");
    try {
      const response = await fetch(`/api/memory?walletAddress=${encodeURIComponent(address)}`);
      const payload = await readApiJson<{ sessions?: MemorySession[]; error?: string }>(response);
      if (!response.ok) throw new Error(payload?.error ?? `Could not load memory: ${response.status}`);
      if (!payload?.sessions) throw new Error("Memory API returned an empty response");
      if (cancelled) return;
      setSessions(payload.sessions);
      setActiveSessionId(payload.sessions[0]?.id);
    } catch (loadError) {
      if (!cancelled) {
        setError(loadError instanceof Error ? loadError.message : "Could not load memory");
      }
    } finally {
      if (!cancelled) setIsLoadingMemory(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !input.trim() || isSending) return;

    const message = input.trim();
    setInput("");
    setIsSending(true);
    setError("");

    const optimisticUserMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: message,
      createdAt: new Date().toISOString()
    };

    if (activeSession) {
      setSessions((current) =>
        current.map((session) =>
          session.id === activeSession.id
            ? { ...session, messages: [...session.messages, optimisticUserMessage] }
            : session
        )
      );
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          walletAddress: auth.walletAddress,
          sessionId: activeSessionId,
          message
        })
      });
      const payload = await readApiJson<{ session?: MemorySession; error?: string }>(response);
      if (!response.ok) throw new Error(payload?.error ?? `Chat request failed with ${response.status}`);
      if (!payload?.session) throw new Error("Chat API returned an empty response");
      const savedSession = payload.session;

      setSessions((current) => {
        const withoutSession = current.filter((session) => session.id !== savedSession.id);
        return [savedSession, ...withoutSession];
      });
      setActiveSessionId(savedSession.id);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Chat request failed");
      if (auth) await loadMemory(auth.walletAddress);
    } finally {
      setIsSending(false);
    }
  }

  function startNewSession() {
    setActiveSessionId(undefined);
    setError("");
  }

  async function disconnect() {
    setShowWallets(false);
    await suiKit.disconnectWallet();
  }

  async function connectInstalledWallet(wallet: (typeof wallets)[number]) {
    setError("");
    try {
      await suiKit.connectWallet({ wallet });
      setShowWallets(false);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Wallet extension connection failed");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <h1>Recall AI</h1>
            <p>Permanent memory for Sui wallets</p>
          </div>
        </div>

        <section className="wallet-panel">
          <div className="panel-heading">
            <h2>Wallet</h2>
            {auth ? <ShieldCheck size={18} color="var(--accent)" /> : <Wallet size={18} />}
          </div>

          {auth ? (
            <>
              <p className="wallet-address">{formatShortAddress(auth.walletAddress)}</p>
              <p className="small-copy">
                {auth.tatumVerified
                  ? `Tatum verified${typeof auth.recentTransactionCount === "number" ? `, ${auth.recentTransactionCount} recent txs` : ""}`
                  : "Connected. Add TATUM_API_KEY for verification."}
              </p>
              <button className="secondary-button" onClick={disconnect} type="button" title="Disconnect wallet">
                <LogOut size={17} />
                Disconnect
              </button>
            </>
          ) : (
            <>
              <p className="small-copy">
                {isSigningIn
                  ? "Confirming wallet ownership..."
                  : "Connect a Sui wallet to restore encrypted Walrus memories."}
              </p>
              <button
                className="primary-button"
                onClick={() => setShowWallets((value) => !value)}
                type="button"
              >
                <Wallet size={18} />
                Connect Sui Wallet
              </button>
              {showWallets ? (
                <div className="wallet-menu">
                  {wallets.length ? (
                    wallets.map((wallet) => (
                      <button
                        className="wallet-option"
                        key={wallet.name}
                        onClick={() => connectInstalledWallet(wallet)}
                        type="button"
                      >
                        {wallet.icon ? <img alt="" src={wallet.icon} /> : <Wallet size={18} />}
                        <span>{wallet.name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="small-copy">
                      No installed Sui wallet extension was detected. Install or enable a Sui-compatible extension, then refresh.
                    </p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className="memory-panel">
          <div className="panel-heading">
            <h2>Memory</h2>
            <div>
              <button className="icon-button" onClick={startNewSession} type="button" title="New session">
                <Plus size={18} />
              </button>
            </div>
          </div>
          <p className="small-copy">
            {walrusStatus
              ? `${walrusStatus.provider}${walrusStatus.publisherConfigured && walrusStatus.aggregatorConfigured ? " active" : " fallback"}`
              : "Checking Walrus storage..."}
          </p>
          <div className="memory-list">
            {isLoadingMemory ? (
              <p className="small-copy">Restoring sessions...</p>
            ) : sessions.length ? (
              sessions.map((session) => (
                <button
                  className="memory-item"
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  type="button"
                >
                  <strong>{session.title}</strong>
                  <span>
                    {session.messages.length} messages - {formatDate(session.updatedAt)}
                  </span>
                  <span>{formatStorageProvider(session)} - {session.blobId ?? "Blob restored"}</span>
                </button>
              ))
            ) : (
              <p className="small-copy">No stored sessions yet.</p>
            )}
          </div>
        </section>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <h2>{activeSession?.title ?? "New Recall session"}</h2>
            <p className="small-copy">
              {suiStatus
                ? `${suiStatus.provider} ${suiStatus.network}, checkpoint ${suiStatus.checkpoint}`
                : auth
                  ? "Memory is encrypted, stored by blobId, and restored into AI context."
                  : "Wallet login required."}
            </p>
          </div>
          <div className="status-pill">
            {auth ? (
              <>
                <CheckCircle2 size={14} /> Sui ID active
              </>
            ) : (
              <>
                <Database size={14} /> Wallet adapter ready
              </>
            )}
          </div>
        </header>

        <div className="chat-stream" ref={streamRef}>
          {messages.length ? (
            messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                {message.content}
              </article>
            ))
          ) : (
            <div className="empty-state">
              <Brain size={48} color="var(--accent)" />
              <h2>Ask once. Remember forever.</h2>
              <p>
                Recall AI restores your prior sessions after wallet login, injects them into the assistant context, and writes the new encrypted session back to Walrus with Sui blob references.
              </p>
            </div>
          )}
          {isSending ? (
            <article className="message assistant">
              <Loader2 size={16} /> Thinking with restored memory...
            </article>
          ) : null}
        </div>

        <footer className="composer">
          <form className="composer-form" onSubmit={sendMessage}>
            <textarea
              disabled={!auth || isSending}
              onChange={(event) => setInput(event.target.value)}
              placeholder={auth ? "Message Recall AI" : "Connect your Sui wallet first"}
              value={input}
            />
            <button className="send-button" disabled={!auth || !input.trim() || isSending} type="submit" title="Send">
              {isSending ? <RefreshCcw size={20} /> : <Send size={20} />}
            </button>
          </form>
          {error ? <p className="error-text">{error}</p> : null}
        </footer>
      </section>
    </main>
  );
}

export default function RecallClient() {
  return (
    <DAppKitProvider dAppKit={dAppKit}>
      <RecallApp />
    </DAppKitProvider>
  );
}
