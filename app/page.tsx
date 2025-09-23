// app/page.tsx

"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
} from "@codesandbox/sandpack-react"
import type { SandpackFiles } from "@codesandbox/sandpack-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Moon, Sun, Send, Sparkles, Columns, MessageSquare, PanelRight, Code, Eye, Lock } from "lucide-react"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"


interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const PASSPHRASE = "hackathon2025"

// 複数のコードブロックを抽出し、HTML内のファイル名を自動修正する関数
const extractAllCodeBlocks = (text: string): SandpackFiles => {
  const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
  const files: SandpackFiles = {};
  let match;

  const fileNames: Record<string, string> = {
    html: "/index.html",
    css: "/styles.css",
    javascript: "/script.js",
    js: "/script.js",
    tsx: "/App.tsx",
    react: "/App.tsx",
  };

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1].toLowerCase();
    const code = match[2];
    const fileName = fileNames[language] || `/${language}.${language}`;
    files[fileName] = { code };
  }

  const htmlFile = files["/index.html"];
  if (htmlFile && typeof htmlFile === 'object' && 'code' in htmlFile) {
    let htmlCode = htmlFile.code;

    if (files["/script.js"]) {
      htmlCode = htmlCode.replace(/<script\s+src="[^"]*"><\/script>/, '<script src="/script.js"></script>');
    }
    if (files["/styles.css"]) {
      htmlCode = htmlCode.replace(/<link\s+rel="stylesheet"\s+href="[^"]*">/, '<link rel="stylesheet" href="/styles.css">');
    }
    
    htmlFile.code = htmlCode;
  }

  return files;
};

export default function VibeCodingTool() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "こんにちは！🎉 マルチファイルプレビューに対応しました！\n「ブロック崩しを作って」と指示するだけで、HTML, CSS, JSを組み合わせたプレビューができます！",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [layout, setLayout] = useState<"split" | "chat" | "preview">("split")
  const [sandpackLayout, setSandpackLayout] = useState<'split' | 'code' | 'preview'>('split');
  const [sandpackFiles, setSandpackFiles] = useState<SandpackFiles>({
    "/index.html": {
      code: `<h1>プレビュー</h1><p>ここにAIが生成したコードの実行結果が表示されます</p>`,
    },
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("vibe-coding-auth");
    if (savedAuth === "authenticated") {
      setIsAuthenticated(true);
    }

    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark)
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle("dark", shouldBeDark)
  }, [])
  
  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    document.documentElement.classList.toggle("dark", newTheme)
    localStorage.setItem("theme", newTheme ? "dark" : "light")
  }

  const handleAuthentication = () => {
    if (passphraseInput === PASSPHRASE) {
      setIsAuthenticated(true);
      sessionStorage.setItem("vibe-coding-auth", "authenticated");
      setAuthError("");
    } else {
      setAuthError("合言葉が間違っています");
      setPassphraseInput("");
    }
  };

  const handlePassphraseKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAuthentication();
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input, timestamp: new Date() }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, messages: messages.slice(-5) }),
      })
      if (!response.ok) throw new Error(await response.text())

      const data = await response.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      const files = extractAllCodeBlocks(data.content)
      if (Object.keys(files).length > 0) {
        setSandpackFiles(files)
      }
    } catch (error) {
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
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
              <p className="text-sm text-muted-foreground">AIと一緒にハッカソン開発</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <div className="flex items-center gap-1 border-l ml-2 pl-2">
              <Button variant={layout === 'chat' ? 'secondary' : 'ghost'} size="icon" onClick={() => setLayout('chat')} title="チャットのみ表示"><MessageSquare className="w-4 h-4" /></Button>
              <Button variant={layout === 'split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setLayout('split')} title="分割表示"><Columns className="w-4 h-4" /></Button>
              <Button variant={layout === 'preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setLayout('preview')} title="プレビューのみ表示"><PanelRight className="w-4 h-4" /></Button>
            </div>
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
                      <div key={message.id} className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        {message.role === "assistant" && <Avatar className="w-8 h-8 shrink-0"><AvatarFallback className="bg-primary text-primary-foreground text-xs">AI</AvatarFallback></Avatar>}
                        <div className={`max-w-[85%] rounded-lg ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                        {message.role === "user" && <Avatar className="w-8 h-8 shrink-0"><AvatarFallback className="bg-accent text-accent-foreground text-xs">YOU</AvatarFallback></Avatar>}
                      </div>
                    ))}
                    {isLoading && <div className="flex justify-start"><div className="bg-muted rounded-lg px-4 py-3">...</div></div>}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <Separator />
                <div className="p-4">
                  <div className="flex gap-2">
                    <Textarea placeholder="メッセージを入力..." value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} className="min-h-[60px] resize-none" disabled={isLoading}/>
                    <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" className="h-[60px] w-[60px]"><Send className="w-4 h-4" /></Button>
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-geist">プレビュー</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant={sandpackLayout === 'code' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSandpackLayout('code')} title="コードのみ表示">
                      <Code className="w-4 h-4" />
                    </Button>
                    <Button variant={sandpackLayout === 'split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSandpackLayout('split')} title="分割表示">
                      <Columns className="w-4 h-4" />
                    </Button>
                    <Button variant={sandpackLayout === 'preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setSandpackLayout('preview')} title="プレビューのみ表示">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 !p-0 relative">
                  <SandpackProvider
                    template="static"
                    theme={isDark ? "dark" : "light"}
                    files={sandpackFiles}
                    options={{ visibleFiles: Object.keys(sandpackFiles) }}
                  >
                    {sandpackLayout === 'split' && (
                      <SandpackLayout className="!flex-col !h-full">
                        <SandpackCodeEditor showTabs closableTabs className="!flex-[0_0_300px]" />
                        <SandpackPreview className="!flex-1" />
                      </SandpackLayout>
                    )}
                    {sandpackLayout === 'code' && (
                      <div className="absolute inset-0">
                        <SandpackCodeEditor showTabs closableTabs style={{ height: '100%', width: '100%' }} />
                      </div>
                    )}
                    {sandpackLayout === 'preview' && (
                      <div className="absolute inset-0">
                        <SandpackPreview style={{ height: '100%', width: '100%' }} />
                      </div>
                    )}
                  </SandpackProvider>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    </div>
  )
}