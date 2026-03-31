'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Camera,
  Upload,
  Sparkles,
  ImageIcon,
  ScanLine,
  Copy,
  Share2,
  MessageCircle,
  History,
  HelpCircle,
  MoreVertical,
  Home,
  FileText,
  Mic,
  BookOpen,
  School,
  Search,
  Settings,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fileToBase64 } from '@/lib/utils'
import type { Profile } from '@/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function SnapPage() {
  const router = useRouter()
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (prof) setProfile(prof as Profile)

      // Count today's snaps
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('snap_queries')
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
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullText,
                  }
                  return updated
                })
              }
            } catch {}
          }
        }
      }

      setSnapsToday(s => s + 1)
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    }

    setLoading(false)
  }

  const canSnap = profile?.is_pro || snapsToday < 5

  return (
    <div className="min-h-screen bg-[#f5f7f9] font-body text-[#2c2f31] antialiased">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 flex-col p-4 border-r border-slate-200 bg-slate-50 z-50">
        <div className="px-2 mb-8">
          <h1 className="text-lg font-black text-sky-900 tracking-tight">
            The Atelier
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-[#595c5e] font-bold">
            Academic Workspace
          </p>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="mb-6 flex items-center justify-center gap-2 bg-[#006094] text-white py-3 rounded-lg shadow-sm font-semibold active:scale-95 transition-all duration-200"
        >
          <Camera size={18} />
          <span>New Snap</span>
        </button>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center gap-3 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-sky-50 hover:text-sky-700 transition-all duration-300"
          >
            <Home size={18} />
            <span className="text-sm font-medium">Home</span>
          </button>

          <button
            onClick={() => router.push('/notes')}
            className="w-full flex items-center gap-3 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-sky-50 hover:text-sky-700 transition-all duration-300"
          >
            <FileText size={18} />
            <span className="text-sm font-medium">Notes</span>
          </button>

          <button
            onClick={() => router.push('/recorder')}
            className="w-full flex items-center gap-3 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-sky-50 hover:text-sky-700 transition-all duration-300"
          >
            <Mic size={18} />
            <span className="text-sm font-medium">Recorder</span>
          </button>

          <button
            onClick={() => router.push('/library')}
            className="w-full flex items-center gap-3 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-sky-50 hover:text-sky-700 transition-all duration-300"
          >
            <BookOpen size={18} />
            <span className="text-sm font-medium">Library</span>
          </button>

          <button
            onClick={() => router.push('/exam-prep')}
            className="w-full flex items-center gap-3 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-sky-50 hover:text-sky-700 transition-all duration-300"
          >
            <School size={18} />
            <span className="text-sm font-medium">Exam Prep</span>
          </button>

          <button
            onClick={() => router.push('/research')}
            className="w-full flex items-center gap-3 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-sky-50 hover:text-sky-700 transition-all duration-300"
          >
            <Search size={18} />
            <span className="text-sm font-medium">Research</span>
          </button>

          {/* ACTIVE STATE */}
          <button
            onClick={() => router.push('/snap')}
            className="w-full flex items-center gap-3 bg-white text-sky-700 rounded-lg shadow-sm font-semibold px-4 py-2.5 transition-all duration-300"
          >
            <Camera size={18} className="text-sky-700" />
            <span className="text-sm">Snap &amp; Ask</span>
          </button>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-200">
          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center gap-3 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-sky-50 transition-all duration-300"
          >
            <Settings size={18} />
            <span className="text-sm font-medium">Settings</span>
          </button>

          <div className="flex items-center gap-3 px-4 py-4 mt-2">
            <div className="w-8 h-8 rounded-full bg-[#4eadf4] flex items-center justify-center text-[#002a44] font-bold text-xs">
              {profile?.full_name?.[0] || 'U'}
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#2c2f31]">
                {profile?.full_name || 'User'}
              </span>
              <span className="text-[10px] text-[#595c5e]">
                {profile?.is_pro ? 'Premium Scholar' : 'Free Scholar'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <main className="relative flex min-h-screen flex-col md:ml-64">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between bg-white/80 px-4 py-4 shadow-sm backdrop-blur-md sm:px-5 md:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <h2 className="text-xl font-bold tracking-tight text-sky-900 sm:text-2xl">
              Snap &amp; Ask
            </h2>

            <div className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />

            <div className="hidden items-center gap-2 text-[#595c5e] sm:flex">
              <History size={16} />
              <span className="text-xs font-medium">History</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-slate-100">
              <HelpCircle size={20} className="text-slate-600" />
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-slate-100">
              <MoreVertical size={20} className="text-slate-600" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="mx-auto flex-1 w-full max-w-6xl px-4 py-6 sm:px-5 md:px-8 md:py-8 lg:px-12">
          <div className="grid grid-cols-12 items-start gap-6 lg:gap-8">
            {/* Left Column */}
            <div className="col-span-12 space-y-6 lg:col-span-7 lg:space-y-8">
              {/* Hero */}
              <section>
                <h3 className="mb-2 text-3xl font-extrabold tracking-tight text-[#2c2f31] sm:text-4xl">
                  Transform images into{' '}
                  <span className="text-[#006094]">insight.</span>
                </h3>

                <p className="text-base text-[#595c5e] md:text-lg">
                  Upload a screenshot, a photo of your textbook, or handwritten
                  notes for instant academic clarification.
                </p>
              </section>

              {/* Capture/Upload Bento Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="group flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-[#abadaf]/10 bg-white p-6 shadow-sm transition-all hover:border-[#006094]/30 sm:p-8"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#4eadf4]/20 transition-transform group-hover:scale-110">
                    <Camera size={28} className="text-[#006094]" />
                  </div>
                  <span className="font-bold text-[#2c2f31]">Take a Photo</span>
                  <span className="text-xs text-[#595c5e] mt-1">
                    Use your webcam
                  </span>
                </button>

                <button
                  onClick={() => {
                    fileRef.current?.removeAttribute('capture')
                    fileRef.current?.click()
                  }}
                  className="group flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-[#abadaf]/10 bg-white p-6 shadow-sm transition-all hover:border-[#006094]/30 sm:p-8"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#c1d2f3]/20 transition-transform group-hover:scale-110">
                    <Upload size={28} className="text-[#4b5c78]" />
                  </div>
                  <span className="font-bold text-[#2c2f31]">Upload Image</span>
                  <span className="text-xs text-[#595c5e] mt-1">
                    PNG, JPG, PDF
                  </span>
                </button>
              </div>

              {/* Input Area */}
              <div className="space-y-4 rounded-xl border border-[#abadaf]/10 bg-white p-4 shadow-sm sm:p-6">
                <div className="relative">
                  <textarea
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    className="min-h-[140px] w-full resize-none rounded-lg border-0 bg-[#eef1f3] p-4 pb-16 text-[#2c2f31] placeholder:text-[#595c5e]/60 focus:ring-2 focus:ring-[#4eadf4]"
                    placeholder="What do you want to know about this snap?"
                  />

                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button
                      onClick={handleAsk}
                      disabled={loading || !question || !canSnap}
                      className="flex h-11 items-center gap-2 rounded-lg bg-[#006094] px-4 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 sm:px-5"
                    >
                      <span>{loading ? 'Asking...' : 'Ask AI'}</span>
                      <Sparkles size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-xs font-bold text-[#595c5e] uppercase tracking-wider w-full mb-1">
                    Quick Actions
                  </span>

                  <button
                    onClick={() => setQuestion('Solve this')}
                    className="rounded-full bg-[#c1d2f3] px-4 py-2 text-xs font-bold text-[#374862] transition-colors hover:bg-[#4eadf4] hover:text-[#002a44]"
                  >
                    Solve this
                  </button>

                  <button
                    onClick={() => setQuestion('Explain this')}
                    className="rounded-full bg-[#c1d2f3] px-4 py-2 text-xs font-bold text-[#374862] transition-colors hover:bg-[#4eadf4] hover:text-[#002a44]"
                  >
                    Explain this
                  </button>

                  <button
                    onClick={() => setQuestion('Expand on this')}
                    className="rounded-full bg-[#c1d2f3] px-4 py-2 text-xs font-bold text-[#374862] transition-colors hover:bg-[#4eadf4] hover:text-[#002a44]"
                  >
                    Expand on this
                  </button>

                  <button
                    onClick={() => setQuestion('Summarize')}
                    className="rounded-full bg-[#c1d2f3] px-4 py-2 text-xs font-bold text-[#374862] transition-colors hover:bg-[#4eadf4] hover:text-[#002a44]"
                  >
                    Summarize
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-span-12 flex h-full flex-col space-y-6 lg:col-span-5">
              {/* Preview Image Placeholder */}
              <div className="relative group">
                {image ? (
                  <div className="aspect-[4/3] bg-[#dfe3e6] rounded-xl overflow-hidden relative flex items-center justify-center border border-[#abadaf]/10">
                    <img
                      src={image}
                      alt="Uploaded snap"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    className="aspect-[4/3] bg-[#dfe3e6] rounded-xl overflow-hidden relative flex items-center justify-center border-2 border-dashed border-[#abadaf]/30"
                  >
                    <div className="text-center p-6 flex flex-col items-center">
                      <ImageIcon size={52} className="text-[#abadaf] mb-3" />
                      <p className="text-[#595c5e] font-medium">
                        No image snapped yet
                      </p>
                      <p className="mt-1 max-w-[200px] text-[11px] text-[#595c5e]/70">
                        Snaps will appear here for processing and OCR analysis.
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-[#006094] group-hover:scale-110 transition-transform">
                  <ScanLine size={20} />
                </div>
              </div>

              {/* AI Response Area */}
              <div className="flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-xl border border-[#abadaf]/10 bg-white shadow-sm md:min-h-[400px]">
                <div className="flex items-center justify-between border-b border-[#e5e9eb] px-4 py-4 sm:px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#006b1b] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#2c2f31]">
                      AI Workspace
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Copy className="w-4 h-4 text-[#595c5e] hover:text-[#006094] cursor-pointer" />
                    <Share2 className="w-4 h-4 text-[#595c5e] hover:text-[#006094] cursor-pointer" />
                  </div>
                </div>

                <div className="flex flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
                  {messages.length === 0 ? (
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-[#006094] flex items-center justify-center text-white shrink-0">
                        <Sparkles size={16} />
                      </div>

                      <div className="space-y-3 flex-1">
                        <div className="h-4 bg-[#eef1f3] rounded w-3/4 animate-pulse" />
                        <div className="h-4 bg-[#eef1f3] rounded w-full animate-pulse" />
                        <div className="h-4 bg-[#eef1f3] rounded w-5/6 animate-pulse" />
                        <div className="pt-2 text-[#595c5e] italic text-sm">
                          Waiting for your first snap to begin analyzing...
                        </div>
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-4 ${
                          message.role === 'user' ? 'justify-end' : ''
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <>
                            <div className="w-8 h-8 rounded-lg bg-[#006094] flex items-center justify-center text-white shrink-0">
                              <Sparkles size={16} />
                            </div>

                            <div className="space-y-3 flex-1">
                              <div className="text-[#2c2f31] text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content}
                                {loading && index === messages.length - 1 && (
                                  <span className="inline-block w-1.5 h-4 bg-[#006094] animate-pulse ml-1 rounded-sm" />
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="max-w-[88%] rounded-2xl rounded-tr-none bg-sky-50 p-4 text-sm text-sky-900 sm:max-w-[80%]">
                            {message.content}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Progress indicator placeholder */}
                <div className="mt-auto p-4 bg-[#eef1f3]/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#595c5e] uppercase">
                      Academic context sync
                    </span>

                    <span className="text-[10px] font-bold text-[#006094]">
                      {loading ? 'Processing...' : '0%'}
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-[#d9dde0] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-[#006094] transition-all duration-500 ${
                        loading ? 'w-full animate-pulse' : 'w-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowProModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <Camera size={28} className="text-[#006094] mb-4" />
            <h2 className="text-xl font-bold text-[#2c2f31] mb-2">
              Daily limit reached
            </h2>
            <p className="text-[#595c5e] text-sm mb-6">
              You&apos;ve used your 5 free snaps for today. Upgrade to Pro for
              unlimited Snap & Ask.
            </p>

            <button className="w-full bg-[#006094] text-white font-bold py-3 rounded-xl hover:bg-[#005482] transition-colors mb-3">
              Upgrade to Pro — ₦800/month
            </button>

            <button
              onClick={() => setShowProModal(false)}
              className="w-full py-3 text-[#595c5e] text-sm hover:text-[#2c2f31] transition-colors"
            >
              Come back tomorrow
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Element */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 sm:right-6 md:bottom-8 md:right-8">
        <button className="rounded-full border border-slate-100 bg-white p-4 text-[#006094] shadow-xl transition-all hover:shadow-2xl active:scale-95">
          <MessageCircle size={20} />
        </button>
      </div>
    </div>
  )
}
