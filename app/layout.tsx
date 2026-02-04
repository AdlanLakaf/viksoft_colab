import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CSV Collaboration Platform',
  description: 'Real-time collaborative CSV data entry and management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
