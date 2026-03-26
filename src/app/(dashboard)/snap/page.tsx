'use client'
import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, Sparkles, ImageIcon, ScanLine, Copy, Share2, MessageCircle, History, HelpCircle, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fileToBase64 } from '@/lib/utils'
import type { Profile } from '@/types'

interface Message { role: 'user' | 'assistant'; content: string }

export default function SnapPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [snapsToday, setSnapsToday] = useState(0)
  const [showProModal, setShowProModal] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (prof) setProfile(prof as Profile)

      // Count today's snaps
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('snap_queries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
      setSnapsToday(count || 0)
    }
    load()
  }, [])

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
    setMessages([])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  async function handleAsk() {
    if (!imageFile || !question) return

    const FREE_LIMIT = 5
    if (!profile?.is_pro && snapsToday >= FREE_LIMIT) {
      setShowProModal(true)
      return
    }

    setLoading(true)
    const userMessage: Message = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])
    setQuestion('')

    try {
      const base64 = await fileToBase64(imageFile)
      const res = await fetch('/api/ai/snap-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: imageFile.type,
          question,
          conversationHistory: messages,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      let fullText = ''
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6))
              if (d.text) {
                fullText += d.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: fullText }
                  return updated
                })
              }
            } catch {}
          }
        }
      }

      setSnapsToday(s => s + 1)
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  const canSnap = profile?.is_pro || snapsToday < 5

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white antialiased">
      {/* Top Sticky Header */}
      <header className="sticky top-0 w-full z-40 bg-[#0A0F1C]/80 backdrop-blur-md px-8 py-4 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">
            Snap <span className="text-teal-400">&</span> Ask
          </h2>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <div className="flex items-center gap-2 text-white/40">
            <History size={16} />
            <span className="text-xs font-medium">History</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <HelpCircle size={20} className="text-white/40" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <MoreVertical size={20} className="text-white/40" />
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="px-6 md:px-12 py-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            {/* Hero */}
            <section>
              <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                Transform images into <span className="text-teal-400">insight.</span>
              </h3>
              <p className="text-white/50 text-base md:text-lg">
                Upload a screenshot, a photo of your textbook, or handwritten notes for instant academic clarification.
              </p>
            </section>

            {/* Capture/Upload */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-2xl border border-white/10 hover:border-teal-400/30 hover:bg-white/10 transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-teal-400/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Camera size={28} className="text-teal-400" />
                </div>
                <span className="font-bold text-white">Take a Photo</span>
                <span className="text-xs text-white/40 mt-1">Use your camera</span>
              </button>

              <button
                onClick={() => { fileRef.current?.removeAttribute('capture'); fileRef.current?.click() }}
                className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-2xl border border-white/10 hover:border-teal-400/30 hover:bg-white/10 transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-teal-400/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={28} className="text-teal-400" />
                </div>
                <span className="font-bold text-white">Upload Image</span>
                <span className="text-xs text-white/40 mt-1">PNG, JPG</span>
              </button>
            </div>

            {/* Question box */}
            <div className="glass-card p-6 space-y-4">
              <div className="relative">
                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  className="w-full min-h-[120px] p-4 bg-white/5 border border-white/10 focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400/30 rounded-xl resize-none text-white placeholder:text-white/30"
                  placeholder="What do you want to know about this snap?"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    onClick={handleAsk}
                    disabled={loading || !question || !canSnap}
                    className="bg-teal-400 text-[#0A0F1C] px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-300 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span>{loading ? 'Asking...' : 'Ask AI'}</span>
                    <Sparkles size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs font-bold text-white/40 uppercase tracking-wider w-full mb-1">
                  Quick Actions
                </span>
                <button onClick={() => setQuestion('Solve this step by step')} className="px-4 py-1.5 rounded-full bg-teal-400/10 text-teal-300 text-xs font-bold hover:bg-teal-400/20 transition-colors">
                  Solve this
                </button>
                <button onClick={() => setQuestion('Explain this clearly')} className="px-4 py-1.5 rounded-full bg-teal-400/10 text-teal-300 text-xs font-bold hover:bg-teal-400/20 transition-colors">
                  Explain this
                </button>
                <button onClick={() => setQuestion('Expand on this topic')} className="px-4 py-1.5 rounded-full bg-teal-400/10 text-teal-300 text-xs font-bold hover:bg-teal-400/20 transition-colors">
                  Expand on this
                </button>
                <button onClick={() => setQuestion('Summarize this')} className="px-4 py-1.5 rounded-full bg-teal-400/10 text-teal-300 text-xs font-bold hover:bg-teal-400/20 transition-colors">
                  Summarize
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-5 flex flex-col h-full space-y-6">
            {/* Preview */}
            <div className="relative group">
              {image ? (
                <div className="aspect-[4/3] bg-white/5 rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10">
                  <img src={image} alt="Uploaded snap" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className="aspect-[4/3] bg-white/5 rounded-2xl overflow-hidden relative flex items-center justify-center border-2 border-dashed border-white/10"
                >
                  <div className="text-center p-6 flex flex-col items-center">
                    <ImageIcon size={60} className="text-white/20 mb-3" />
                    <p className="text-white/50 font-medium">No image snapped yet</p>
                    <p className="text-[11px] text-white/30 mt-1 max-w-[200px]">
                      Snaps will appear here for processing and OCR analysis.
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-[#0A0F1C] rounded-full shadow-lg flex items-center justify-center text-teal-400 border border-white/10 group-hover:scale-110 transition-transform">
                <ScanLine size={20} />
              </div>
            </div>

            {/* AI Response */}
            <div className="flex-1 glass-card flex flex-col overflow-hidden min-h-[400px]">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/80">
                    AI Workspace
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Copy size={16} className="text-white/40 hover:text-white/70 cursor-pointer" />
                  <Share2 size={16} className="text-white/40 hover:text-white/70 cursor-pointer" />
                </div>
              </div>

              <div className="p-8 flex flex-col gap-6 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-teal-400 flex items-center justify-center text-[#0A0F1C] shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
                      <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                      <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
                      <div className="pt-2 text-white/40 italic text-sm">
                        Waiting for your first snap to begin analyzing...
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                      {message.role === 'assistant' ? (
                        <>
                          <div className="w-8 h-8 rounded-lg bg-teal-400 flex items-center justify-center text-[#0A0F1C] shrink-0">
                            <Sparkles size={16} />
                          </div>
                          <div className="space-y-3 flex-1">
                            <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                              {message.content}
                              {loading && index === messages.length - 1 && (
                                <span className="inline-block w-1.5 h-4 bg-teal-400 animate-pulse ml-1 rounded-sm" />
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="bg-teal-400/10 p-4 rounded-2xl rounded-tr-none text-sm text-teal-100 max-w-[80%] border border-teal-400/10">
                          {message.content}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Progress */}
              <div className="mt-auto p-4 bg-white/5 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase">
                    Academic context sync
                  </span>
                  <span className="text-[10px] font-bold text-teal-400">
                    {loading ? 'Processing...' : '0%'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full bg-teal-400 transition-all duration-500 ${loading ? 'w-full animate-pulse' : 'w-0'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
      />

      {/* Pro upgrade modal */}
      {showProModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowProModal(false)}>
          <div className="glass-card p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <Camera size={28} className="text-teal-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Daily limit reached</h2>
            <p className="text-white/50 text-sm mb-6">
              You&apos;ve used your 5 free snaps for today. Upgrade to Pro for unlimited Snap & Ask.
            </p>
            <button className="w-full bg-teal-400 text-[#0A0F1C] font-bold py-3 rounded-xl hover:bg-teal-300 transition-colors mb-3">
              Upgrade to Pro — ₦800/month
            </button>
            <button onClick={() => setShowProModal(false)} className="w-full py-3 text-white/40 text-sm hover:text-white/60 transition-colors">
              Come back tomorrow
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Element */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 items-end">
        <button className="p-4 bg-[#0A0F1C] text-teal-400 rounded-full shadow-xl hover:shadow-2xl active:scale-95 transition-all border border-white/10 hover:bg-white/5">
          <MessageCircle size={20} />
        </button>
      </div>
    </div>
  )
}