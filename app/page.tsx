"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Send,
  FileText,
  Settings,
  User,
  Upload,
  MessageSquare,
  Bot,
  Loader2,
  Maximize2,
  Download,
  FileDown,
  Menu,
  X,
} from "lucide-react"

interface Message {
  id: number
  type: "system" | "user" | "ai"
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export default function EPGASAnalytics() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "system",
      content:
        "EPGAS Analytics AIへようこそ。電力・ガス業界の取引分析レポートを自動生成いたします。分析したい内容をお聞かせください。",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [showSampleReport, setShowSampleReport] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState<"chat" | "preview">("chat")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return

    setIsProcessing(true)

    // Add user message
    const newUserMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    }

    // Add AI response placeholder
    const aiResponse: Message = {
      id: messages.length + 2,
      type: "ai",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    }

    setMessages((prev) => [...prev, newUserMessage, aiResponse])
    setInputMessage("")

    const streamingTexts = [
      "分析を開始しています...",
      "データを処理中...",
      "電力販売データを解析しています...",
      "グラフとチャートを生成中...",
      "レポートを最終化しています...",
      "2024年度電力販売実績分析レポートを生成しました。右側のプレビューでご確認ください。\n\n主要な分析結果:\n• 総売上高: 86.4億円（前年比+5.6%）\n• 総顧客数: 60,500件（前年比+8.2%）\n• 夏期需要が最も高く、猛暑による冷房需要増加が寄与\n• 業務用セグメントが好調（+8.1%）",
    ]

    for (let i = 0; i < streamingTexts.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiResponse.id
            ? {
                ...msg,
                content: streamingTexts[i],
                isStreaming: i < streamingTexts.length - 1,
              }
            : msg,
        ),
      )
    }

    setShowSampleReport(true)
    setIsProcessing(false)
    if (window.innerWidth < 768) {
      setActiveView("preview")
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/csv") {
      const uploadMessage: Message = {
        id: messages.length + 1,
        type: "user",
        content: `CSVファイル「${file.name}」をアップロードしました。このデータを分析してください。`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, uploadMessage])
    }
  }

  const handleDownloadHTML = () => {
    if (!showSampleReport) return

    // Create a download link for the HTML content
    const link = document.createElement("a")
    link.href = "/sample-report.html"
    link.download = "電力販売実績分析レポート_2024.html"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadPDF = () => {
    if (!showSampleReport) return

    // Simulate PDF generation
    alert("PDF変換機能は開発中です。現在はHTMLファイルをダウンロードしてブラウザでPDF印刷をご利用ください。")
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-foreground">EPGAS Analytics</h1>
              <p className="text-sm text-muted-foreground">電力・ガス特化レポート自動生成</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-foreground">EPGAS</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="md:hidden flex">
              <Button
                variant={activeView === "chat" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("chat")}
                className="text-xs px-2"
              >
                チャット
              </Button>
              <Button
                variant={activeView === "preview" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("preview")}
                className="text-xs px-2"
              >
                プレビュー
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <User className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="sm:hidden mt-4 pt-4 border-t space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              設定
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <User className="w-4 h-4 mr-2" />
              ユーザー
            </Button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Section */}
        <div
          className={`${
            isFullscreen ? "hidden" : activeView === "chat" ? "w-full md:w-3/10" : "hidden md:flex md:w-3/10"
          } flex flex-col border-r`}
        >
          {/* Chat Header */}
          <div className="border-b px-4 md:px-6 py-3 bg-card/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">チャット履歴</span>
              <span className="text-xs text-muted-foreground">({messages.length - 1}件のメッセージ)</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex items-start gap-2 md:gap-3 max-w-[90%] md:max-w-[85%]">
                  {message.type !== "user" && (
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      {message.type === "system" ? (
                        <FileText className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                      ) : (
                        <Bot className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div
                      className={`rounded-lg px-3 md:px-4 py-2 md:py-3 ${
                        message.type === "user"
                          ? "bg-blue-600 text-white"
                          : message.type === "system"
                            ? "bg-muted text-muted-foreground"
                            : "bg-card border text-foreground"
                      }`}
                    >
                      <p className="text-xs md:text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                      {message.isStreaming && (
                        <div className="flex items-center gap-2 mt-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-xs opacity-70">生成中...</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground px-1">{formatTime(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t p-4 md:p-6">
            <div className="mb-3 md:mb-4">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer bg-transparent text-xs md:text-sm"
                  asChild
                >
                  <span>
                    <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    CSVデータをアップロード
                  </span>
                </Button>
              </label>
            </div>

            <div className="flex gap-2 md:gap-3">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="分析したい内容を入力してください（例：2024年度の電力販売実績を分析してください）"
                className="flex-1 min-h-[60px] md:min-h-[80px] resize-none text-sm"
                disabled={isProcessing}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isProcessing} className="self-end">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground">Enterで送信、Shift+Enterで改行</p>
              {isProcessing && <p className="text-xs text-blue-600 font-medium">AI分析中...</p>}
            </div>
          </div>
        </div>

        {/* HTML Preview Section */}
        <div
          className={`${
            isFullscreen ? "w-full" : activeView === "preview" ? "w-full md:w-7/10" : "hidden md:flex md:w-7/10"
          } flex flex-col`}
        >
          <div className="border-b px-4 md:px-6 py-4 bg-card">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-sm md:text-base">HTMLプレビュー</h2>
              <div className="flex gap-1 md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "通常表示" : "フルスクリーン表示"}
                  className="hidden md:flex bg-transparent"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!showSampleReport}
                  onClick={handleDownloadHTML}
                  className="text-xs px-2 md:px-3 bg-transparent"
                >
                  <Download className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  <span className="hidden sm:inline">HTML出力</span>
                  <span className="sm:hidden">HTML</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!showSampleReport}
                  onClick={handleDownloadPDF}
                  className="text-xs px-2 md:px-3 bg-transparent"
                >
                  <FileDown className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  <span className="hidden sm:inline">PDF変換</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {showSampleReport ? (
              <iframe
                ref={iframeRef}
                src="/sample-report.html"
                className="w-full h-full border-0"
                title="Generated Report Preview"
                style={{ backgroundColor: "#f8f9fa" }}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/20 p-4">
                <div className="text-center space-y-3 max-w-md">
                  <FileText className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto" />
                  <h3 className="text-base md:text-lg font-medium text-foreground">レポートプレビュー</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    <span className="md:hidden">
                      チャットで分析要求を送信すると、
                      <br />
                      生成されたHTMLレポートがここに表示されます
                    </span>
                    <span className="hidden md:inline">
                      左側のチャットで分析要求を送信すると、
                      <br />
                      生成されたHTMLレポートがここに表示されます
                    </span>
                  </p>
                  <div className="mt-4 p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700">
                      <strong>サンプル入力例:</strong>
                      <br />
                      「2024年度の電力販売実績を分析してください」
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
