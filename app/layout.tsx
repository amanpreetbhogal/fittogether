import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitTogether",
  description: "Stay fit together with your partner",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#141414', color: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
