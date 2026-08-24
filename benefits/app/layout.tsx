import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "הטבות ביחד",
  description:
    "כל ההטבות של החברים שלכם במקום אחד — מי חבר במה, ואיך מבקשים ממנו.",
};

export const viewport: Viewport = {
  themeColor: "#3b6ef5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={assistant.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
