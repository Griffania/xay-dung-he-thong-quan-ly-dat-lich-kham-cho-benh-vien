import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project LVTN Frontend',
  description: 'Next.js frontend running on port 3000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
