import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Space_Grotesk } from "next/font/google"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "バイブコーディング - ハッカソン向けAIツール",
  description:
    "初心者でも使いやすいAI APIライブコーディングツール。ハッカソンでアイデアからコード生成まで一緒に開発しよう！",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${geist.variable} ${spaceGrotesk.variable} antialiased`}>
      <body>{children}</body>
    </html>
  )
}
