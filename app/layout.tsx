import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recall AI",
  description: "A decentralized AI chatbot with permanent encrypted memory on Walrus and Sui."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
