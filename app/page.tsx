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
  // Use local state instead of useChat for now
  const [localInput, setLocalInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  // ストリーミングは必須機能として固定
  const useStreaming = true

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "system",
      content:
        "EPGAS Analytics AIへようこそ。電力・ガス業界の取引分析レポートを自動生成いたします。分析したい内容をお聞かせください。",
      timestamp: new Date(),
    },
  ])
  const [showSampleReport, setShowSampleReport] = useState(false)
  const [currentReportFile, setCurrentReportFile] = useState("/sample-report.html")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState<"chat" | "preview">("chat")
  
  // HTML生成進捗状態
  const [htmlGenerationStatus, setHtmlGenerationStatus] = useState<
    "idle" | "started" | "ai_completed" | "parsing" | "saving" | "completed" | "error"
  >("idle")
  const [generationProgress, setGenerationProgress] = useState("")
  const [progressError, setProgressError] = useState("")
  const [sseConnected, setSseConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const checkForLatestReport = async () => {
    try {
      // publicディレクトリ内の最新のreport_*.htmlファイルを検索
      const response = await fetch('/api/latest-report')
      if (response.ok) {
        const data = await response.json()
        if (data.latestReportFile) {
          setCurrentReportFile(`/${data.latestReportFile}`)
          return data.latestReportFile
        }
      }
    } catch (error) {
      console.log('No latest report available yet')
    }
    return null
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Server-Sent Events接続を管理
  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimer: NodeJS.Timeout | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 3

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/html-progress')
        
        eventSource.onopen = () => {
          console.log('SSE接続が開かれました')
          setSseConnected(true)
          reconnectAttempts = 0
        }
        
        eventSource.onmessage = (event) => {
          try {
            const { type, data } = JSON.parse(event.data)
            
            switch (type) {
              case 'html_generation_started':
                setHtmlGenerationStatus('started')
                setGenerationProgress(data.message)
                setProgressError("")
                break
              
              case 'ai_response_completed':
                setHtmlGenerationStatus('ai_completed')
                setGenerationProgress(data.message)
                break
              
              case 'html_parsing_started':
                setHtmlGenerationStatus('parsing')
                setGenerationProgress(data.message)
                break
              
              case 'file_saving_started':
                setHtmlGenerationStatus('saving')
                setGenerationProgress(data.message)
                break
              
              case 'file_saved':
                setHtmlGenerationStatus('completed')
                setGenerationProgress(data.message)
                setCurrentReportFile(`/${data.filename}`)
                setShowSampleReport(true)
                
                // モバイルでは自動でプレビュー表示に切り替え
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setActiveView("preview")
                }
                
                // 3秒後にidleに戻す
                setTimeout(() => {
                  setHtmlGenerationStatus('idle')
                  setGenerationProgress("")
                }, 3000)
                break
              
              case 'error':
                setHtmlGenerationStatus('error')
                setProgressError(data.message + (data.error ? `: ${data.error}` : ''))
                setGenerationProgress("")
                break
              
              case 'timeout':
                console.log('SSE接続がタイムアウトしました:', data.message)
                break
              
              case 'connected':
                console.log('SSE接続が確立されました:', data.message)
                break
            }
          } catch (error) {
            console.error('SSEデータの解析に失敗:', error)
          }
        }

        eventSource.onerror = () => {
          console.log('SSE接続でエラーが発生しました。再接続を試行します。')
          setSseConnected(false)
          
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }
          
          // 再接続を試行（最大3回まで）
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            console.log(`SSE再接続を試行中... (${reconnectAttempts}/${maxReconnectAttempts})`)
            
            reconnectTimer = setTimeout(() => {
              connectSSE()
            }, 2000 * reconnectAttempts) // 段階的に遅延を増加
          } else {
            console.log('SSE再接続の最大試行回数に達しました。フォールバック機能を使用します。')
            setSseConnected(false)
          }
        }

      } catch (error) {
        console.error('SSE初期化エラー:', error)
      }
    }

    connectSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
        eventSource = null
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading || !localInput || localInput.trim().length === 0) return

    setIsLoading(true)

    // Add user message to local state
    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: localInput,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = localInput
    setLocalInput("")

    try {
      // Call API directly
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: currentInput }],
          stream: useStreaming
        }),
      })

      if (!response.ok) {
        throw new Error('API call failed')
      }

      // Add AI response placeholder
      const aiMessage: Message = {
        id: Date.now() + 1,
        type: "ai",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      }

      setMessages(prev => [...prev, aiMessage])

      if (useStreaming) {
        // Handle streaming response
        const reader = response.body?.getReader()
        if (reader) {
          let accumulatedText = ""
          const decoder = new TextDecoder()

          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              // Mark streaming as complete
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === aiMessage.id 
                    ? { ...msg, content: accumulatedText, isStreaming: false }
                    : msg
                )
              )
              
              // SSE接続が失敗している場合のフォールバック
              if (!sseConnected) {
                setTimeout(async () => {
                  const latestFile = await checkForLatestReport()
                  if (latestFile) {
                    setCurrentReportFile(`/${latestFile}`)
                    setShowSampleReport(true)
                    console.log('フォールバック: 最新レポートを確認しました:', latestFile)
                    
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      setActiveView("preview")
                    }
                  }
                }, 2000)
              }
              
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            accumulatedText += chunk

            // Update AI message with accumulated text (still streaming)
            setMessages(prev => 
              prev.map(msg => 
                msg.id === aiMessage.id 
                  ? { ...msg, content: accumulatedText, isStreaming: true }
                  : msg
              )
            )
          }
        }
      } else {
        // Handle non-streaming response
        const responseData = await response.json()
        const content = responseData.content || ''

        // Update AI message with complete response
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, content: content, isStreaming: false }
              : msg
          )
        )
      }
    } catch (error) {
      console.error('Error calling API:', error)
      // Add error message
      const errorMessage: Message = {
        id: Date.now() + 2,
        type: "ai",
        content: "申し訳ございません。エラーが発生しました。Ollamaサーバーが起動していることを確認してください。",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }


  const handleDownloadHTML = () => {
    if (!showSampleReport) return

    // Create a download link for the HTML content
    const link = document.createElement("a")
    link.href = currentReportFile
    
    // ファイル名から拡張子を除いた部分を取得してダウンロード名を生成
    const fileName = currentReportFile.split('/').pop() || 'report.html'
    const baseName = fileName.replace('.html', '')
    link.download = `${baseName}_電力ガス分析レポート.html`
    
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
            {/* ストリーミングは必須機能のためボタンを非表示 */}
            {/* CSVアップロード機能は現時点では非搭載のため非表示 */}
            {/* <div className="mb-3 md:mb-4 flex gap-2">
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
              <Button
                variant={useStreaming ? "default" : "outline"}
                size="sm"
                onClick={() => setUseStreaming(!useStreaming)}
                className="text-xs md:text-sm"
              >
                {useStreaming ? "ストリーミング" : "一括応答"}
              </Button>
            </div> */}

            <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3">
              <Textarea
                ref={textareaRef}
                value={localInput}
                onChange={(e) => {
                  setLocalInput(e.target.value)
                }}
                placeholder="分析したい内容を入力してください（例：2024年度の電力販売実績を分析してください）"
                className="flex-1 min-h-[60px] md:min-h-[80px] resize-none text-sm"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e as any)
                  }
                }}
              />
              <Button type="submit" disabled={isLoading || !localInput || localInput.length === 0} className="self-end">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground">Enterで送信、Shift+Enterで改行</p>
              {isLoading && <p className="text-xs text-blue-600 font-medium">AI分析中...</p>}
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
            {/* HTML生成中の表示 */}
            {htmlGenerationStatus !== 'idle' && htmlGenerationStatus !== 'completed' && htmlGenerationStatus !== 'error' ? (
              <div className="h-full flex items-center justify-center bg-muted/20 p-4">
                <div className="text-center space-y-4 max-w-md">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-blue-600 mx-auto animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-base md:text-lg font-medium text-foreground">AI分析中</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-blue-600 font-medium">{generationProgress}</p>
                    
                    {/* 進捗バー */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: htmlGenerationStatus === 'started' ? '25%' : 
                                htmlGenerationStatus === 'ai_completed' ? '50%' :
                                htmlGenerationStatus === 'parsing' ? '75%' :
                                htmlGenerationStatus === 'saving' ? '90%' : '0%'
                        }}
                      ></div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {htmlGenerationStatus === 'started' && '🤖 AI応答処理中...'}
                      {htmlGenerationStatus === 'ai_completed' && '✅ AI応答完了'}
                      {htmlGenerationStatus === 'parsing' && '🔍 HTML解析中...'}
                      {htmlGenerationStatus === 'saving' && '💾 ファイル保存中...'}
                    </div>
                  </div>
                </div>
              </div>
            ) : htmlGenerationStatus === 'error' ? (
              <div className="h-full flex items-center justify-center bg-muted/20 p-4">
                <div className="text-center space-y-3 max-w-md">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <X className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
                  </div>
                  <h3 className="text-base md:text-lg font-medium text-red-600">エラーが発生しました</h3>
                  <p className="text-sm text-red-500">{progressError}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setHtmlGenerationStatus('idle')
                      setProgressError('')
                    }}
                    className="mt-4"
                  >
                    再試行
                  </Button>
                </div>
              </div>
            ) : showSampleReport ? (
              <iframe
                ref={iframeRef}
                src={currentReportFile}
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
