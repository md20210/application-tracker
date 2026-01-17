import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Bot, User, Trash2 } from 'lucide-react'
import { sendChatMessage, getChatHistory, clearChatHistory } from '../utils/api'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
  metadata?: any
}

interface ChatResponse {
  message: string
  context_used: any[]
  action_taken: any
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState('ollama')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadHistory = async () => {
    try {
      const res = await getChatHistory(50)
      setMessages(res.data)
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')

    // Add user message optimistically
    const tempUserMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      setLoading(true)
      const res = await sendChatMessage(userMessage, provider)
      const data: ChatResponse = res.data

      // Add assistant response
      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
        metadata: {
          action_taken: data.action_taken,
          context_used: data.context_used,
        },
      }
      setMessages((prev) => [...prev, assistantMsg])

      // Show action notification if status was updated
      if (data.action_taken) {
        showNotification(
          `✅ Status-Update: ${data.action_taken.company} → ${data.action_taken.new_status}`
        )
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      const errorMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ Fehler: ${error.response?.data?.detail || error.message}`,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    if (confirm('Chat-Historie wirklich löschen?')) {
      try {
        await clearChatHistory()
        setMessages([])
      } catch (error) {
        console.error('Error clearing history:', error)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showNotification = (message: string) => {
    // Simple notification (you could use a proper toast library)
    alert(message)
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-3xl font-bold text-white">Chat</h2>
        <div className="flex items-center space-x-4">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
          >
            <option value="ollama">Ollama (Lokal)</option>
            <option value="grok">Grok (Cloud)</option>
            <option value="anthropic">Claude (Cloud)</option>
          </select>
          <button
            onClick={handleClearHistory}
            className="p-2 text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
            title="Historie löschen"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 overflow-y-auto p-4 space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Willkommen im Application Tracker Chat!</p>
            <p className="text-sm">Stelle Fragen zu deinen Bewerbungen oder aktualisiere den Status.</p>
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Beispiele:</p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-500">• "Wie viele Bewerbungen habe ich?"</p>
                <p className="text-gray-500">• "Status von Allianz auf Interview setzen"</p>
                <p className="text-gray-500">• "Zeige alle Bewerbungen mit Absage"</p>
                <p className="text-gray-500">• "Welche Dokumente habe ich für SAP hochgeladen?"</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[80%] ${
                  msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-primary-600' : 'bg-gray-700'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <div
                  className={`rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  {msg.metadata?.action_taken && (
                    <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-300">
                      ✅ Aktion: {msg.metadata.action_taken.action} für{' '}
                      {msg.metadata.action_taken.company}
                    </div>
                  )}
                  {msg.metadata?.context_used && msg.metadata.context_used.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
                      📄 {msg.metadata.context_used.length} Dokumente verwendet
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-700 rounded-lg px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-end space-x-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nachricht eingeben... (Enter zum Senden, Shift+Enter für neue Zeile)"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
          rows={3}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          <span>Senden</span>
        </button>
      </div>
    </div>
  )
}
