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
  Download,
  X,
  Trash2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fileToBase64 } from '@/lib/utils'
import type { Profile, Course, SnapQuery } from '@/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function SnapPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [detectedCourse, setDetectedCourse] = useState<string | null>(null)
  const [contextLoading, setContextLoading] = useState(true)

  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [snapsToday, setSnapsToday] = useState(0)

  const [showProModal, setShowProModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const [historySnaps, setHistorySnaps] = useState<SnapQuery[]>([])

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setContextLoading(false)
        return
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (prof) setProfile(prof as Profile)

      const { data: userCourses } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        
      if (userCourses) {
        setCourses(userCourses)
        if (userCourses.length > 0) {
          const courseNames = userCourses.map(c => c.course_code).join(', ')
          setDetectedCourse(courseNames)
        }
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('snap_queries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())

      setSnapsToday(count || 0)
      
      let query = supabase
        .from('snap_queries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (prof && !(prof as Profile).is_pro) {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        query = query.gte('created_at', thirtyDaysAgo.toISOString())
      }

      const { data: pastSnaps } = await query
      if (pastSnaps) setHistorySnaps(pastSnaps)
      
      setContextLoading(false)
    }

    load()
  }, [supabase])

  async function handleDeleteSnap(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('snap_queries').delete().eq('id', id).eq('user_id', user.id)
    setHistorySnaps(prev => prev.filter(s => s.id !== id))
  }

  async function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)

    const reader = new FileReader()
    reader.onloadend = () => setImage(reader.result as string)
    reader.readAsDataURL(file)

    setMessages([])
    await autoAnalyze(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  async function autoAnalyze(file: File) {
    const FREE_LIMIT = 5
    if (!profile?.is_pro && snapsToday >= FREE_LIMIT) {
      setShowProModal(true)
      return
    }

    setLoading(true)
    const defaultQuestion = "Analyse this image. Describe all academic content — equations, diagrams, text, problems — in detail. Be thorough."
    setMessages([{ role: 'user', content: defaultQuestion }])

    try {
      const base64 = await fileToBase64(file)

      let contextPrefix = ''
      if (courses.length > 0) {
        contextPrefix = `[Context: The user is studying the following courses: ${courses.map(c => c.course_code + ' - ' + c.course_name).join(', ')}. Try to relate the analysis to these subjects if applicable.]\n\n`
      }

      const res = await fetch('/api/ai/snap-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
          question: contextPrefix + defaultQuestion,
          conversationHistory: [],
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
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
         await supabase.from('snap_queries').insert({
            user_id: user.id,
            image_url: 'uploaded_image',
            question: defaultQuestion,
            ai_response: fullText,
         })
         const { data: pastSnaps } = await supabase
          .from('snap_queries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        
         if (pastSnaps) setHistorySnaps(pastSnaps)
      }
      
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    }

    setLoading(false)
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
    const currentQ = question
    setQuestion('')

    try {
      const base64 = await fileToBase64(imageFile)

      const res = await fetch('/api/ai/snap-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: imageFile.type,
          question: currentQ,
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
    <div className="mx-auto w-full max-w-7xl space-y-6 text-[#2c2f31] md:space-y-8">
      <div className="flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#595c5e]">Vision Workspace</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#2c2f31] md:text-4xl">
            Snap &amp; Ask
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#595c5e] md:text-base">
            Upload a screenshot, textbook photo, or handwritten note and let Cursus turn it into guided academic insight.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#006094] px-5 text-sm font-bold text-white shadow-lg shadow-[#006094]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Camera size={16} />
            New Snap
          </button>

          <div className="flex items-center gap-2 relative">
            <button 
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#595c5e] transition-colors hover:bg-slate-50"
            >
              <History size={16} />
              History
            </button>
            <button 
              onClick={() => setShowHelpModal(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-[#595c5e] transition-colors hover:bg-slate-50"
            >
              <HelpCircle size={18} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-[#595c5e] transition-colors hover:bg-slate-50"
              >
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-12 z-10 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <button 
                    onClick={() => {
                      const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
                      navigator.clipboard.writeText(text)
                      setShowMenu(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#2c2f31] hover:bg-slate-50"
                  >
                    <Copy size={14} /> Copy conversation
                  </button>
                  <button 
                    onClick={() => {
                      setMessages([])
                      setShowMenu(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Clear conversation
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#2c2f31] hover:bg-slate-50"
                  >
                    <Download size={14} /> Export to PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:gap-8">
        <div className="space-y-6">
          <section className="rounded-[28px] bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#2c2f31] sm:text-4xl">
              Transform images into <span className="text-[#006094]">insight.</span>
            </h2>
            <p className="mt-3 max-w-2xl text-base text-[#595c5e] md:text-lg">
              Upload a screenshot, a photo of your textbook, or handwritten notes for instant academic clarification.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="group flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-[#abadaf]/10 bg-[#fcfdff] p-6 shadow-sm transition-all hover:border-[#006094]/30 sm:p-8"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#4eadf4]/20 transition-transform group-hover:scale-110">
                  <Camera size={28} className="text-[#006094]" />
                </div>
                <span className="font-bold text-[#2c2f31]">Take a Photo</span>
                <span className="mt-1 text-xs text-[#595c5e]">Use your webcam</span>
              </button>

              <button
                onClick={() => {
                  fileRef.current?.removeAttribute('capture')
                  fileRef.current?.click()
                }}
                className="group flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-[#abadaf]/10 bg-[#fcfdff] p-6 shadow-sm transition-all hover:border-[#006094]/30 sm:p-8"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#c1d2f3]/20 transition-transform group-hover:scale-110">
                  <Upload size={28} className="text-[#4b5c78]" />
                </div>
                <span className="font-bold text-[#2c2f31]">Upload Image</span>
                <span className="mt-1 text-xs text-[#595c5e]">PNG, JPG, PDF</span>
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#abadaf]/10 bg-white p-4 shadow-sm sm:p-6">
            <div className="relative">
              <textarea
                ref={chatInputRef}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                className="min-h-[140px] w-full resize-none rounded-2xl border-0 bg-[#eef1f3] p-4 pb-16 text-[#2c2f31] placeholder:text-[#595c5e]/60 focus:ring-2 focus:ring-[#4eadf4]"
                placeholder="What do you want to know about this snap?"
              />

              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  onClick={handleAsk}
                  disabled={loading || !question || !canSnap}
                  className="flex h-11 items-center gap-2 rounded-xl bg-[#006094] px-4 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 sm:px-5"
                >
                  <span>{loading ? 'Asking...' : 'Ask AI'}</span>
                  <Sparkles size={16} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 pt-2">
              <span className="mb-1 w-full text-xs font-bold uppercase tracking-wider text-[#595c5e]">
                Quick Actions
              </span>

              {['Solve this', 'Explain this', 'Expand on this', 'Summarize'].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setQuestion(prompt)}
                  className="rounded-full bg-[#c1d2f3] px-4 py-2 text-xs font-bold text-[#374862] transition-colors hover:bg-[#4eadf4] hover:text-[#002a44]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="relative">
            {image ? (
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[28px] border border-[#abadaf]/10 bg-[#dfe3e6]">
                <img
                  src={image}
                  alt="Uploaded snap"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed border-[#abadaf]/30 bg-[#dfe3e6]"
              >
                <div className="flex flex-col items-center p-6 text-center">
                  <ImageIcon size={52} className="mb-3 text-[#abadaf]" />
                  <p className="font-medium text-[#595c5e]">No image snapped yet</p>
                  <p className="mt-1 max-w-[220px] text-[11px] text-[#595c5e]/70">
                    Snaps will appear here for processing and OCR analysis.
                  </p>
                </div>
              </div>
            )}

            <div className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#006094] shadow-lg transition-transform group-hover:scale-110">
              <ScanLine size={20} />
            </div>
          </div>

          <div className="flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-[28px] border border-[#abadaf]/10 bg-white shadow-sm md:min-h-[400px]">
            <div className="flex items-center justify-between border-b border-[#e5e9eb] px-4 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#006b1b] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#2c2f31]">
                  AI Workspace
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Copy className="h-4 w-4 cursor-pointer text-[#595c5e] hover:text-[#006094]" />
                <Share2 className="h-4 w-4 cursor-pointer text-[#595c5e] hover:text-[#006094]" />
              </div>
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
              {messages.length === 0 ? (
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#006094] text-white">
                    <Sparkles size={16} />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#eef1f3]" />
                    <div className="h-4 w-full animate-pulse rounded bg-[#eef1f3]" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-[#eef1f3]" />
                    <div className="pt-2 text-sm italic text-[#595c5e]">
                      Waiting for your first snap to begin analyzing...
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {message.role === 'assistant' ? (
                      <>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#006094] text-white">
                          <Sparkles size={16} />
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#2c2f31]">
                            {message.content}
                            {loading && index === messages.length - 1 ? (
                              <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#006094]" />
                            ) : null}
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

            <div className="mt-auto bg-[#eef1f3]/50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#595c5e]">
                  Academic context sync
                </span>
                <span className="text-[10px] font-bold text-[#006094]">
                  {contextLoading ? 'Syncing...' : (detectedCourse ? 'Synced' : 'No context')}
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#d9dde0]">
                <div
                  className={`h-full bg-[#006094] transition-all duration-500 ${
                    contextLoading ? 'w-full animate-pulse' : (detectedCourse ? 'w-full' : 'w-0')
                  }`}
                />
              </div>
              {!contextLoading && detectedCourse && (
                <p className="mt-2 text-[10px] font-medium text-[#595c5e]">
                  Matched: {detectedCourse}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
      />

      {showProModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowProModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <Camera size={28} className="mb-4 text-[#006094]" />
            <h2 className="mb-2 text-xl font-bold text-[#2c2f31]">
              Daily limit reached
            </h2>
            <p className="mb-6 text-sm text-[#595c5e]">
              You&apos;ve used your 5 free snaps for today. Upgrade to Pro for
              unlimited Snap & Ask.
            </p>

            <button className="mb-3 w-full rounded-xl bg-[#006094] py-3 font-bold text-white transition-colors hover:bg-[#005482]">
              Upgrade to Pro — ₦800/month
            </button>

            <button
              onClick={() => setShowProModal(false)}
              className="w-full py-3 text-sm text-[#595c5e] transition-colors hover:text-[#2c2f31]"
            >
              Come back tomorrow
            </button>
          </div>
        </div>
      ) : null}

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setShowHistoryModal(false)}>
          <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-[#2c2f31]">Snap History</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {historySnaps.length === 0 ? (
                <p className="text-sm text-[#595c5e] text-center pt-8">No snaps yet.</p>
              ) : (
                historySnaps.map(snap => (
                  <div key={snap.id} className="relative p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-[#006094]/30 cursor-pointer transition-colors group" onClick={() => {
                    setMessages([
                      { role: 'user', content: snap.question },
                      { role: 'assistant', content: snap.ai_response }
                    ])
                    setShowHistoryModal(false)
                  }}>
                    {profile?.is_pro && (
                      <button 
                        onClick={(e) => handleDeleteSnap(snap.id, e)}
                        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <p className="text-xs font-bold text-[#006094] mb-1">
                      {new Date(snap.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-medium text-[#2c2f31] line-clamp-2 pr-6">
                      {snap.question}
                    </p>
                    <p className="text-xs text-[#595c5e] line-clamp-2 mt-2">
                      {snap.ai_response}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowHelpModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-[#2c2f31]">How to use Snap & Ask</h2>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 text-sm text-[#595c5e]">
              <p><strong>1. Upload a clear image:</strong> Ensure text, equations, or diagrams are well-lit and readable.</p>
              <p><strong>2. Auto-Analysis:</strong> The AI automatically starts analyzing the image the moment you upload it.</p>
              <p><strong>3. Course Context:</strong> If you have courses added to your profile, the AI will use them to tailor its answers specifically to what you are studying.</p>
              <p><strong>4. Daily Limits:</strong> Free users get 5 snaps per day. Upgrade to Pro for unlimited snaps.</p>
            </div>
            <button onClick={() => setShowHelpModal(false)} className="mt-8 w-full rounded-xl bg-slate-100 py-3 font-bold text-[#2c2f31] hover:bg-slate-200">
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 sm:right-6 md:bottom-8 md:right-8">
        <button 
          onClick={() => {
            chatInputRef.current?.focus()
            chatInputRef.current?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="rounded-full border border-slate-100 bg-white p-4 text-[#006094] shadow-xl transition-all hover:shadow-2xl active:scale-95"
        >
          <MessageCircle size={20} />
        </button>
      </div>
    </div>
  )
}
