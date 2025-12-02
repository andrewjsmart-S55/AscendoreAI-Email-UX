import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AscendoreAuthProvider } from '@/contexts/AscendoreAuthContext'
import { QueryProvider } from '@/contexts/QueryProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AscendoreAI Email - Intelligent Email Client',
  description: 'A modern, intelligent email client with AI-powered features',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AscendoreAuthProvider>
            <ThemeProvider>
              {children}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                    borderRadius: '8px',
                  },
                  success: {
                    style: {
                      background: '#059669',
                      color: '#fff',
                    },
                  },
                  error: {
                    style: {
                      background: '#dc2626',
                      color: '#fff',
                    },
                  },
                }}
              />
            </ThemeProvider>
          </AscendoreAuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
