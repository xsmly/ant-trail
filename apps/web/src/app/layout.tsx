import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ant Trail - Platform Ketahanan Pangan Indonesia',
  description: 'Dashboard keputusan untuk digitalisasi ketahanan pangan lintas daerah di Indonesia',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
