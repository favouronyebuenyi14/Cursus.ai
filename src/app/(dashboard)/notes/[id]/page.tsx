'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles, Lock, Download, RotateCcw, Layers } from 'lucide-react'
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
  const [showProModal, setShowProModal] = useState(false)
  const [saved, setSaved] = useState(true)

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
  }, [id])

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!note) return
    setSaved(false)
    const t = setTimeout(async () => {
      await supabase.from('notes').update({
        title: title || 'Untitled note',
        raw_content: content,
        updated_at: new Date().toISOString(),
      }).eq('id', note.id)
      setSaved(true)
    }, 2000)
    return () => clearTimeout(t)
  }, [title, content])

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
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-[#0D1425]">
        <Link href="/notes" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
          <ArrowLeft size={15} /> Notes
        </Link>
        <div className="w-px h-4 bg-white/10" />
        <span className="text-xs text-white/30">{saving ? 'Saving...' : saved ? 'Saved' : 'Unsaved'}</span>

        <div className="ml-auto flex items-center gap-2">
          {expandedContent && (
            <div className="flex bg-white/5 rounded-lg p-0.5 text-xs">
              <button onClick={() => setView('raw')}
                className={`px-3 py-1 rounded-md transition-colors ${view === 'raw' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
                Raw
              </button>
              <button onClick={() => setView('expanded')}
                className={`px-3 py-1 rounded-md transition-colors ${view === 'expanded' ? 'bg-teal-400/10 text-teal-400' : 'text-white/40 hover:text-white/60'}`}>
                AI Expanded
              </button>
            </div>
          )}
          <button onClick={handleExpand} disabled={aiLoading || !content}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-colors ${
              profile?.is_pro
                ? 'bg-teal-400/10 text-teal-400 hover:bg-teal-400/20 border border-teal-400/20'
                : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
            } disabled:opacity-50`}>
            {profile?.is_pro ? <Sparkles size={13} /> : <Lock size={13} />}
            {aiLoading ? 'Expanding...' : 'AI Expand'}
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium bg-white/5 text-white/50 hover:bg-white/10 border border-white/10 transition-colors">
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-3xl mx-auto w-full">
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full bg-transparent text-2xl md:text-3xl font-bold text-white placeholder:text-white/20 focus:outline-none mb-6 border-none" />

        {view === 'raw' ? (
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Start writing your notes here... Let your thoughts flow. AI will help structure them."
            className="w-full bg-transparent text-white/80 placeholder:text-white/20 focus:outline-none resize-none text-base leading-relaxed min-h-[60vh]" />
        ) : (
          <div className="prose-cursus">
            {aiLoading ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`h-4 bg-white/5 rounded animate-pulse ${i % 3 === 0 ? 'w-2/3' : 'w-full'}`} />
                ))}
              </div>
            ) : (
              <MarkdownRenderer content={expandedContent} />
            )}
          </div>
        )}
      </div>

      {/* Pro modal */}
      {showProModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowProModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-teal-400/10 flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-teal-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Unlock AI expansion</h2>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              AI note expansion is part of Cursus Pro. Write your notes and let AI turn them into comprehensive study material.
            </p>
            <button className="w-full bg-teal-400 text-[#0A0F1C] font-bold py-3 rounded-xl hover:bg-teal-300 transition-colors mb-3">
              Upgrade to Pro — ₦800/month
            </button>
            <button onClick={() => setShowProModal(false)} className="w-full py-3 text-white/40 hover:text-white/60 text-sm transition-colors">
              Maybe later
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// Simple markdown renderer
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-white mt-5 mb-2">{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3">{line.slice(2)}</h1>
        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-medium text-white/90 mt-4 mb-1">{line.slice(4)}</h3>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="text-white/70 text-sm ml-4 leading-relaxed list-disc">{line.slice(2)}</li>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-white text-sm">{line.slice(2, -2)}</p>
        if (line === '') return <br key={i} />
        return <p key={i} className="text-white/70 text-sm leading-relaxed">{line}</p>
      })}
    </div>
  )
}
