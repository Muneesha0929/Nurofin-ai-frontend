import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'Nurofin-Executive-AI',
  description: 'Enterprise-grade Executive Dashboard and AI Assistant for Nurofin CEO Vincent.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('nurofin-theme');
                  var theme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

