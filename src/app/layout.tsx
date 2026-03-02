import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const title = "BPMN Studio — AI-Powered BPMN Diagram Generator";
const description =
  "AI-powered tool that converts natural language prompts into BPMN diagrams. Design, version, and deploy business processes effortlessly.";
const url = "https://bpmnstudio.app";

export const metadata: Metadata = {
  title: {
    default: title,
    template: "%s | BPMN Studio",
  },
  description,
  metadataBase: new URL(url),
  keywords: [
    "BPMN",
    "BPMN diagram",
    "AI BPMN generator",
    "business process modeling",
    "process automation",
    "natural language to BPMN",
    "workflow design",
    "BPMN 2.0",
    "process design tool",
  ],
  authors: [{ name: "BPMN Studio" }],
  creator: "BPMN Studio",
  openGraph: {
    type: "website",
    locale: "en_US",
    url,
    siteName: "BPMN Studio",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
