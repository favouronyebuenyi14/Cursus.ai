'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Sparkles, Lock, Download, Share2, Settings,
  FileText, BookOpen, History, Users, Archive,
  Layers, ListChecks, Wand2, MessageCircle, Bot
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Note, Profile } from '@/types'

export default function NoteEditorPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [note, setNote] = useState<Note | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [expandedContent, setExpandedContent] = useState('')
  const [view, setView] = useState<'raw' | 'expanded'>('raw')
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [showProModal, setShowProModal] = useState(false)

  // Load note & profile
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [noteRes, profRes] = await Promise.all([
        supabase.from('notes').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      ])

      if (noteRes.data) {
        const n = noteRes.data as Note
        setNote(n)
        setTitle(n.title || '')
        setContent(n.raw_content || '')
        setExpandedContent(n.ai_expanded_content || '')
        if (n.ai_expanded_content) setView('expanded')
      }

      if (profRes.data) setProfile(profRes.data as Profile)
    }
    load()
  }, [id, supabase])

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!note) return
    setSaved(false)
    const t = setTimeout(async () => {
      setSaving(true)
      await supabase.from('notes').update({
        title: title || 'Untitled note',
        raw_content: content,
        updated_at: new Date().toISOString(),
      }).eq('id', note.id)
      setSaved(true)
      setSaving(false)
    }, 2000)
    return () => clearTimeout(t)
  }, [title, content])

  // AI Expand
  async function handleExpand() {
    if (!profile?.is_pro) { setShowProModal(true); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/expand-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      })
      if (!res.ok) throw new Error('AI failed')

      let fullText = ''
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
              const d = JSON.parse(line.slice(6))
              if (d.text) { fullText += d.text; setExpandedContent(fullText) }
            } catch {}
          }
        }
      }

      await supabase.from('notes').update({ ai_expanded_content: fullText }).eq('id', note!.id)
      setView('expanded')
    } catch (e) {
      console.error(e)
    }
    setAiLoading(false)
  }

  // PDF Export
  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(title || 'Untitled note', 20, 20)
    doc.setFontSize(11)
    const textToExport = view === 'expanded' && expandedContent ? expandedContent : content
    const lines = doc.splitTextToSize(textToExport, 170)
    doc.text(lines, 20, 35)
    doc.save(`${title || 'note'}.pdf`)
  }

  const displayContent = view === 'expanded' && expandedContent ? expandedContent : content

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#f5f7f9] text-[#2c2f31]">

      {/* Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col p-4 z-40 bg-[#f5f7f9] border-r border-transparent">
        <div className="mb-8 px-2">
          <h1 className="text-xl font-bold text-[#006094] tracking-tight">The Atelier</h1>
          <p className="text-xs text-[#595c5e] font-medium">Editorial Workspace</p>
        </div>

        <button
          onClick={() => router.push('/notes')}
          className="mb-6 flex items-center justify-center gap-2 bg-[#006094] text-white py-3 px-4 rounded-lg font-bold shadow-sm active:scale-[0.98] transition-transform"
        >
          <BookOpen size={18} />
          <span>New Note</span>
        </button>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => router.push('/notes')}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-white text-[#006094] rounded-lg shadow-sm font-semibold transition-colors duration-200"
          >
            <FileText size={18} />
            <span className="font-medium text-sm tracking-tight">My Notes</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[#595c5e] hover:bg-[#eef1f3] rounded-lg transition-colors duration-200">
            <History size={18} />
            <span className="font-medium text-sm tracking-tight">Recent</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[#595c5e] hover:bg-[#eef1f3] rounded-lg transition-colors duration-200">
            <Users size={18} />
            <span className="font-medium text-sm tracking-tight">Shared</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[#595c5e] hover:bg-[#eef1f3] rounded-lg transition-colors duration-200">
            <Layers size={18} />
            <span className="font-medium text-sm tracking-tight">Flashcards</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[#595c5e] hover:bg-[#eef1f3] rounded-lg transition-colors duration-200">
            <Archive size={18} />
            <span className="font-medium text-sm tracking-tight">Archive</span>
          </button>
        </nav>

        <div className="mt-auto pt-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[#595c5e] hover:bg-[#eef1f3] rounded-lg transition-colors duration-200">
            <Settings size={18} />
            <span className="font-medium text-sm tracking-tight">Settings</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-4 mt-2">
            <div className="w-10 h-10 rounded-full bg-[#4eadf4] flex items-center justify-center overflow-hidden text-[#002a44] font-black">
              {profile?.full_name?.[0] || 'U'}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#2c2f31]">
                {profile?.full_name || 'User'}
              </span>
              <span className="text-[10px] text-[#595c5e] font-bold tracking-widest">
                {profile?.is_pro ? 'PRO' : 'FREE'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Editor */}
      <main className="md:ml-64 flex-1 flex flex-col h-screen">

        {/* Top Bar */}
        <header className="fixed top-0 left-0 right-0 md:left-64 h-16 flex items-center justify-between px-6 md:px-8 z-30 bg-white/80 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-lg font-black text-[#006094]">Cursus Editor</span>
            <div className="hidden md:block h-4 w-[1px] bg-[#abadaf] opacity-20" />
            <span className="hidden md:block text-xs text-[#595c5e] font-medium">
              {saving ? 'Saving...' : saved ? 'Saved' : 'Unsaved'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-[#006094] text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-all">
              <Download size={16} />
              <span className="hidden sm:block">Export as PDF</span>
            </button>

            <button onClick={handleExpand} className="p-2 text-[#595c5e] hover:text-[#006094] transition-colors">
              {profile?.is_pro ? <Sparkles size={18} /> : <Lock size={18} />}
            </button>

            <button className="p-2 text-[#595c5e] hover:text-[#006094] transition-colors">
              <Share2 size={18} />
            </button>
          </div>
        </header>

        {/* Editor Surface */}
        <div className="mt-16 flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-[#eef1f3] p-6 md:p-8 flex justify-center">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-[0px_10px_40px_rgba(44,47,49,0.04)] min-h-[1228px] p-8 md:p-16 flex flex-col">

              {/* Back */}
              <div className="mb-6">
                <Link href="/notes" className="inline-flex items-center gap-2 text-sm font-bold text-[#595c5e] hover:text-[#006094] transition-colors">
                  <ArrowLeft size={16} /> Back to Notes
                </Link>
              </div>

              {/* Title */}
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title..." className="w-full bg-transparent text-3xl md:text-4xl font-extrabold text-[#2c2f31] placeholder:text-[#595c5e]/40 focus:outline-none mb-8 border-none tracking-tight" />

              {/* Content */}
              {view === 'raw' ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Start writing your notes here..."
                  className="w-full bg-transparent text-[#2c2f31] placeholder:text-[#595c5e]/50 focus:outline-none resize-none text-lg leading-relaxed min-h-[70vh]"
                />
              ) : (
                <div className="prose max-w-none">
                  {aiLoading ? (
                    <div className="space-y-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className={`h-4 bg-slate-200 rounded animate-pulse ${i % 3 === 0 ? 'w-2/3' : 'w-full'}`} />
                      ))}
                    </div>
                  ) : (
                    <MarkdownRenderer content={expandedContent} />
                  )}
                </div>
              )}

              {/* View Toggle */}
              {expandedContent && (
                <div className="mt-10 flex bg-[#eef1f3] rounded-lg p-1 text-xs w-fit border border-slate-200">
                  <button onClick={() => setView('raw')} className={`px-4 py-2 rounded-md font-bold transition-colors ${view === 'raw' ? 'bg-white text-[#2c2f31] shadow-sm' : 'text-[#595c5e] hover:text-[#2c2f31]'}`}>Raw</button>
                  <button onClick={() => setView('expanded')} className={`px-4 py-2 rounded-md font-bold transition-colors ${view === 'expanded' ? 'bg-white text-[#006094] shadow-sm' : 'text-[#595c5e] hover:text-[#006094]'}`}>AI Expanded</button>
                </div>
              )}
            </div>
          </div>

          {/* AI Right Panel */}
          <aside className="hidden lg:flex w-80 bg-[#f5f7f9] p-6 flex-col gap-6 overflow-y-auto">
            {/* AI Buttons omitted for brevity — keep your existing buttons */}
          </aside>
        </div>
      </main>
    </div>
  )
}

// Markdown renderer remains same
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-[#006094] mt-10 mb-4">{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-extrabold text-[#2c2f31] mt-6 mb-3">{line.slice(2)}</h1>
        if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-[#2c2f31] mt-6 mb-2">{line.slice(4)}</h3>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="text-[#2c2f31] text-base ml-6 leading-relaxed list-disc">{line.slice(2)}</li>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-[#2c2f31] text-base">{line.slice(2, -2)}</p>
        if (line === '') return <br key={i} />
        return <p key={i} className="text-[#2c2f31] text-lg leading-relaxed">{line}</p>
      })}
    </div>
  )
}