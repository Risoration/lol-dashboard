import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '../components/ui/sonner';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import NavigationWrapper from './components/NavigationWrapper';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LoL Dashboard - Track Your League Performance',
  description:
    'Track your League of Legends stats, match history, and performance',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <NavigationWrapper />
          <div className='pt-16'>{children}</div>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
