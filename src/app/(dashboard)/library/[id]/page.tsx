'use client'

import { useEffect, useState, useRef, FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Bot, Sparkles, ArrowLeft, Send, User as UserIcon, Trash2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ProModal from '@/components/ProModal'
import PdfViewer from '@/components/PdfViewer'
import type { Document, Profile } from '@/types'
import Script from 'next/script'

type Message = { role: 'user' | 'assistant', content: string }

export default function DocumentViewerPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [document, setDocument] = useState<Document | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [extractedText, setExtractedText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [showProModal, setShowProModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [docRes, profRes] = await Promise.all([
        supabase.from('documents').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('profiles').select('*').eq('user_id', user.id).single()
      ])

      if (docRes.data) {
        const doc = docRes.data as Document
        
        // If it's an old document where we only stored the path, convert it to a full public URL now
        if (!doc.file_url.startsWith('http')) {
          const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(doc.file_url)
          doc.file_url = publicUrl
        }
        
        setDocument(doc)

        // If we already extracted text before, use it
        if (doc.extracted_text) {
          setExtractedText(doc.extracted_text)
        } else if (doc.summary) {
          setExtractedText(doc.summary)
        }
      }
      
      if (profRes.data) setProfile(profRes.data as Profile)

      // Load chat history
      const savedMessages = localStorage.getItem(`library_chat_${id}`)
      if (savedMessages) {
        try { setMessages(JSON.parse(savedMessages)) } catch {}
      }

      setLoading(false)
    }
    load()
  }, [id, supabase])

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`library_chat_${id}`, JSON.stringify(messages))
    }
  }, [messages, id])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, chatLoading])

  useEffect(() => {
    if (showChat && document?.file_url) {
      extractText()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChat, document?.file_url])

  // Extract PDF text using pdf.js loaded via CDN
  async function extractText() {
    if (!document?.file_url || extractedText || extracting || document?.summary) return
    
    // Check if pdfjsLib is available
    const pdfjs = (window as any)['pdfjs-dist/build/pdf']
    if (!pdfjs) {
      console.warn("pdfjs not loaded yet")
      return
    }

    setExtracting(true)
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'
      
      const proxyUrl = `/api/proxy-document?url=${encodeURIComponent(document.file_url)}`
      const loadingTask = pdfjs.getDocument(proxyUrl)
      const pdf = await loadingTask.promise
      
      let fullText = ''
      // Read first 20 pages to avoid crashing the browser for massive books
      const maxPages = Math.min(pdf.numPages, 20) 
      
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const strings = content.items.map((item: any) => item.str)
        fullText += strings.join(' ') + '\n\n'
      }
      
      setExtractedText(fullText)

      // Save extracted text to database so we don't have to extract it again
      await supabase.from('documents').update({ 
        extracted_text: fullText,
        summary: fullText.slice(0, 500) // Keep summary small
      }).eq('id', document?.id)
      
    } catch (err) {
      console.error('Failed to extract PDF text:', err)
    } finally {
      setExtracting(false)
    }
  }

  async function handleChat(e?: FormEvent) {
    if (e) e.preventDefault()
    if (!input.trim() || !extractedText) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/ai/pdf-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentText: extractedText,
          question: userMessage 
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        if (res.status === 403) setShowProModal(true)
        else alert(data?.error || 'AI Chat Failed')
        setMessages(prev => prev.slice(0, -1)) // Revert message
        setChatLoading(false)
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.text) {
                setMessages(prev => {
                  const newArr = [...prev]
                  newArr[newArr.length - 1].content += parsed.text
                  return newArr
                })
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error(err)
      alert("Failed to send message")
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center"><div className="animate-pulse h-10 w-32 bg-slate-200 rounded mx-auto" /></div>
  if (!document) return <div className="p-8 text-center text-xl font-bold">Document not found</div>

  return (
    <>
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js" 
      />
      
      <div className="flex flex-col md:flex-row h-screen bg-[#f8f9fa] overflow-hidden">
        {/* Left Side: PDF Viewer */}
        <div className="flex-1 flex flex-col h-[50vh] md:h-full border-b md:border-b-0 md:border-r border-slate-200 bg-white relative">
          <div className="flex items-center gap-4 p-4 border-b border-slate-100 bg-white z-10 shrink-0">
            <button 
              onClick={() => router.push('/library')}
              className="text-[#595c5e] hover:text-[#006094] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-[#2c2f31] truncate flex-1">{document.title}</h1>
            {extracting && <span className="text-xs font-bold text-[#006094] animate-pulse">Extracting text for AI...</span>}
            {document.file_url && (
              <a 
                href={`/api/proxy-document?url=${encodeURIComponent(document.file_url)}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-bold text-[#006094] hover:underline whitespace-nowrap hidden sm:inline-block"
              >
                Open in new tab
              </a>
            )}
            
            <button 
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ml-2 ${
                showChat ? 'bg-slate-100 text-[#595c5e] hover:bg-slate-200' : 'bg-[#006094] text-white hover:opacity-90 shadow-sm'
              }`}
            >
              <Sparkles size={16} />
              {showChat ? 'Close AI' : 'Ask AI'}
            </button>
          </div>
          
          <div className="flex-1 w-full bg-slate-100 relative">
            <PdfViewer url={document.file_url} />
          </div>
        </div>

        {/* Right Side: AI Chat */}
        {showChat && (
          <div className="w-full md:w-[450px] lg:w-[500px] flex flex-col h-[50vh] md:h-full bg-white shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20 transition-all duration-300">
            <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-2 shrink-0">
              <Sparkles size={18} className="text-[#006094]" />
              <h2 className="font-bold text-[#2c2f31]">Chat with Document</h2>
            </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-10 opacity-60">
                <Bot size={40} className="mx-auto mb-3 text-[#595c5e]" />
                <p className="font-semibold text-[#2c2f31]">Ask anything about this document</p>
                <p className="text-sm text-[#595c5e] mt-1">
                  Summarize chapters, ask for key formulas, or clarify concepts.
                </p>
              </div>
            ) : null}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-[#006094] text-white' : 'bg-[#eef1f3] text-[#006094]'
                }`}>
                  {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                </div>
                <div className={`px-4 py-3 rounded-2xl max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-[#006094] text-white rounded-tr-sm' 
                    : 'bg-[#f5f7f9] text-[#2c2f31] rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {chatLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-full bg-[#eef1f3] text-[#006094] flex items-center justify-center">
                  <Bot size={14} />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-[#f5f7f9] text-[#2c2f31] rounded-tl-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#006094] rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-[#006094] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 bg-[#006094] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-100 bg-white shrink-0">
            <form onSubmit={handleChat} className="relative flex items-center">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={extractedText ? "Ask a question..." : "Extracting text, please wait..."}
                disabled={!extractedText || chatLoading}
                className="w-full bg-[#f5f7f9] border-none rounded-full pl-5 pr-12 py-3 text-sm focus:ring-2 focus:ring-[#006094]/30 disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!extractedText || !input.trim() || chatLoading}
                className="absolute right-2 h-8 w-8 rounded-full bg-[#006094] text-white flex items-center justify-center disabled:opacity-50 transition-colors hover:bg-[#005482]"
              >
                <Send size={14} className="ml-0.5" />
              </button>
            </form>
          </div>
        </div>
        )}
      </div>

      {showProModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
            <Sparkles size={28} className="mb-4 text-[#006094]" />
            <h2 className="mb-2 text-xl font-bold text-[#2c2f31]">Upgrade to Pro</h2>
            <p className="mb-6 text-sm text-[#595c5e]">
              You've reached your free limit for PDF interactions. Upgrade to Pro for unlimited PDF chat!
            </p>
            <button 
              onClick={() => setShowProModal(false)}
              className="w-full py-3 text-sm text-[#595c5e] hover:text-[#2c2f31]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
