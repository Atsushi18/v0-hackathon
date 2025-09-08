"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Moon, Sun, Send, Copy, Sparkles, Lock, Columns, MessageSquare, PanelRight } from "lucide-react"
import { Input } from "@/components/ui/input"
// import { Sandpack } from "@codesandbox/sandpack-react"
// import type { SandpackPredefinedTemplate } from "@codesandbox/sandpack-react"
import { SandpackProvider, SandpackLayout, SandpackPreview, SandpackConsole } from "@codesandbox/sandpack-react"
import type { SandpackPredefinedTemplate } from "@codesandbox/sandpack-react"

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isCode?: boolean
  language?: string
}

const PASSPHRASE = process.env.NEXT_PUBLIC_PASSPHRASE

const languageToTemplate: Record<string, string> = {
  javascript: "vanilla-ts",
  js: "vanilla-ts",
  typescript: "vanilla-ts",
  ts: "vanilla-ts",
  react: "react-ts",
  jsx: "react-ts",
  tsx: "react-ts",
  vue: "vue",
  // python: "python",
  // py: "python",
  html: "static",
  css: "static",
  vite: "vite-react-ts",
}

const languageToExtension: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  react: "tsx",
  jsx: "tsx",
  tsx: "tsx",
  vue: "vue",
  // python: "py",
  html: "html",
  css: "css",
}

export default function VibeCodingTool() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passphraseInput, setPassphraseInput] = useState("")
  const [authError, setAuthError] = useState("")

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "こんにちは！🎉 ハッカソン向けのAIコーディングアシスタントです！\n\nReact, Python, HTMLなど様々な言語のコードプレビューに対応しました！何から始めますか？",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)

  const [latestCode, setLatestCode] = useState<string | null>(null) // ◀️ 追加
  const [latestLang, setLatestLang] = useState<string | null>(null) // ◀️ 追加
  const [layout, setLayout] = useState<"split" | "chat" | "preview">("split")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("vibe-coding-auth")
    if (savedAuth === "authenticated") {
      setIsAuthenticated(true)
    }

    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark)

    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle("dark", shouldBeDark)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleAuthentication = () => {
    if (passphraseInput === PASSPHRASE) {
      setIsAuthenticated(true)
      sessionStorage.setItem("vibe-coding-auth", "authenticated")
      setAuthError("")
    } else {
      setAuthError("合言葉が間違っています")
      setPassphraseInput("")
    }
  }

  const handlePassphraseKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAuthentication()
    }
  }

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    document.documentElement.classList.toggle("dark", newTheme)
    localStorage.setItem("theme", newTheme ? "dark" : "light")
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const requestData = {
        message: input,
        messages: messages.slice(-5),
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP Error: ${response.status}`)
      }

      const data = await response.json()

      const codeBlockMatch = data.content.match(/```(\w+)\n/)
      const language = codeBlockMatch ? codeBlockMatch[1].toLowerCase() : undefined
      const isCode = !!language && languageToTemplate.hasOwnProperty(language)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        isCode,
        language,
      }

      if (isCode && language) {
        setLatestCode(extractCode(data.content, language));
        setLatestLang(language);
      }


      console.log("AIメッセージの判定結果:", { isCode: assistantMessage.isCode, language: assistantMessage.language, content: data.content });

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("[v0] Frontend Error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ エラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const extractCode = (content: string, lang?: string) => {
    if (!lang) return ""
    const regex = new RegExp("```" + lang + "\\n([\\s\\S]*?)```")
    const match = content.match(regex)
    return match ? match[1] : ""
  }

  const getFileName = (lang?: string) => {
    if (!lang) return "index.js"
    const extension = languageToExtension[lang] || "js"

    return ["react", "jsx", "tsx"].includes(lang) ? `App.${extension}` : `index.${extension}`
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background font-sans flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-geist">バイブコーディング</CardTitle>
            <p className="text-muted-foreground">合言葉を入力してください</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="合言葉を入力..."
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                onKeyPress={handlePassphraseKeyPress}
                className="text-center"
              />
              {authError && <p className="text-sm text-destructive text-center">{authError}</p>}
            </div>
            <Button onClick={handleAuthentication} className="w-full" disabled={!passphraseInput.trim()}>
              入室する
            </Button>
            <div className="flex justify-center">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <div className="flex items-center gap-2">
                <Button variant={layout === 'chat' ? 'secondary' : 'ghost'} size="icon" onClick={() => setLayout('chat')}>
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button variant={layout === 'split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setLayout('split')}>
                  <Columns className="w-4 h-4" />
                </Button>
                <Button variant={layout === 'preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setLayout('preview')}>
                  <PanelRight className="w-4 h-4" />
                </Button>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background font-sans">
      <header className="border-b bg-card/50 backdrop-blur-sm shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-geist">バイブコーディング</h1>
              <p className="text-sm text-muted-foreground">
                AIと一緒にハッカソン開発
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

            <div className="flex items-center gap-1 border-l ml-2 pl-2">
              <Button variant={layout === 'chat' ? 'secondary' : 'ghost'} size="icon" onClick={() => setLayout('chat')} title="チャットのみ表示">
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button variant={layout === 'split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setLayout('split')} title="分割表示">
                <Columns className="w-4 h-4" />
              </Button>
              <Button variant={layout === 'preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setLayout('preview')} title="プレビューのみ表示">
                <PanelRight className="w-4 h-4" />
              </Button>
            </div>
        
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {layout !== 'preview' && (
          <ResizablePanel defaultSize={layout === 'split' ? 50 : 100}>
          <div className="h-full p-4">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="font-geist flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  AIアシスタント
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-4 pb-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : "justify-start"
                          }`}
                      >
                        {message.role === "assistant" && (
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">AI</AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[85%] rounded-lg ${message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted relative group"
                            }`}
                        >
                          <p className="px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                          <div className="flex items-center justify-between px-4 pb-3 -mt-2">
                            <p className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {message.role === "assistant" && (
                              <div className="flex gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => copyToClipboard(message.content)}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        {message.role === "user" && (
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="bg-accent text-accent-foreground text-xs">YOU</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">AI</AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg px-4 py-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <Separator />
                <div className="p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="メッセージを入力... (Enterで送信、Shift+Enterで改行)"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="min-h-[60px] resize-none"
                      disabled={isLoading}
                    />
                    <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" className="h-[60px] w-[60px]">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
        )}
        {layout === 'split' && <ResizableHandle withHandle />}

        {layout !== 'chat' && (
          <ResizablePanel defaultSize={layout === 'split' ? 50 : 100}>
          <div className="h-full flex flex-col p-4">
            <Card className="flex-1 h-full flex flex-col">
              <CardHeader>
                <CardTitle className="font-geist">プレビュー</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 h-full !p-0"> {/* ◀️ パディングを削除 */}
                {latestCode && latestLang ? (
                  // ▼▼▼ 正しいプレビューのみの表示方法 ▼▼▼
                  <SandpackProvider
                    template={languageToTemplate[latestLang] as SandpackPredefinedTemplate || "static"}
                    theme={isDark ? "dark" : "light"}
                    files={{ [getFileName(latestLang)]: latestCode }}

                  >
                    <SandpackLayout className="!flex-col !h-full">
                      <SandpackPreview className="!flex-1" showNavigator={true} />
                      <SandpackConsole className="!flex-[0_0_150px]" />
                    </SandpackLayout>
                  </SandpackProvider>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground p-6">
                    <p>AIにコードを生成させると、ここにプレビューが表示されます</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
        )}
      </ResizablePanelGroup>
    </div>
  )
}