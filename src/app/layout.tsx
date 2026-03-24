import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cursus — AI Academic Workspace',
  description: 'Your AI-powered academic workspace. Smart notes, lecture recording, exam prep, and more — built for Nigerian university students.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cursus',
  },
  openGraph: {
    title: 'Cursus — AI Academic Workspace',
    description: 'Smart notes, lecture recording, exam prep, and more.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#00D4AA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-[#f5f7f9] text-[#2c2f31] antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
