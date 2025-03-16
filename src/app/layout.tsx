import './globals.css'
import { Providers } from '@/components/layout/Providers'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'פורטל ניהול פרויקטים - משרד ראשי',
  description: 'מערכת ניהול פרויקטים, משימות ומעקב למשרד הראשי',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${inter.className} rtl`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
} 