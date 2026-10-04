import './globals.css';
import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/auth-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OwaFind — Find What May Belong to You',
  description:
    'OwaFind helps people discover potential pension, insurance and other financial benefits that may be waiting to be claimed.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
