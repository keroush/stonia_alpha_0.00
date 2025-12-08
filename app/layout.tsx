import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stonia - Sketch to G-Code',
  description: 'Convert hand-drawn sketches to G-Code',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

