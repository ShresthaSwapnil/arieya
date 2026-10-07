import "@fontsource-variable/manrope";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "lenis/dist/lenis.css";
import type { Metadata } from "next";
import "./globals.css";
import { SmoothScroll } from "./motion";

const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  icons: { icon: "/favicon.svg" },
  metadataBase: new URL(origin),
  title: "Arieya — Product discovery that starts with a conversation.",
  description:
    "Help shoppers find the right product through a natural conversation grounded in your real catalogue.",
  openGraph: {
    title: "Arieya — Product discovery that starts with a conversation.",
    description: "A conversational shopping advisor for independent online stores.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arieya — Product discovery that starts with a conversation.",
    description: "A shopping advisor with character. Try three questions, explore your catalogue, and find a more considered fit.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><SmoothScroll>{children}</SmoothScroll></body>
    </html>
  );
}
