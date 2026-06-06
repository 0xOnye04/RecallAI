"use client";

import dynamic from "next/dynamic";

const RecallClient = dynamic(() => import("@/app/recall-client"), {
  ssr: false,
  loading: () => (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <h1>Recall AI</h1>
            <p>Permanent memory for Sui wallets</p>
          </div>
        </div>
      </aside>
      <section className="main">
        <div className="chat-stream">
          <div className="empty-state">
            <h2>Loading Recall AI</h2>
            <p>Preparing the Sui wallet adapter.</p>
          </div>
        </div>
      </section>
    </main>
  )
});

export default function ClientShell() {
  return <RecallClient />;
}
