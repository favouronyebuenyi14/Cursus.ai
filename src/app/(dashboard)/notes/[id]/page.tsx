'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Download, Lock, Share2, Sparkles, Wand2,
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [noteRes, profRes] = await Promise.all([
        supabase.from('notes').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      ])

      if (noteRes.data) {
        const loadedNote = noteRes.data as Note
        setNote(loadedNote)
        setTitle(loadedNote.title || '')
        setContent(loadedNote.raw_content || '')
        setExpandedContent(loadedNote.ai_expanded_content || '')
        if (loadedNote.ai_expanded_content) setView('expanded')
      }

      if (profRes.data) setProfile(profRes.data as Profile)
    }

    load()
  }, [id, supabase])

  useEffect(() => {
    if (!note) return

    setSaved(false)
    const timer = setTimeout(async () => {
      setSaving(true)
      await supabase.from('notes').update({
        title: title || 'Untitled note',
        raw_content: content,
        updated_at: new Date().toISOString(),
      }).eq('id', note.id)
      setSaved(true)
      setSaving(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [title, content, note, supabase])

  async function handleExpand() {
    if (!profile?.is_pro) {
      setShowProModal(true)
      return
    }

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
              const data = JSON.parse(line.slice(6))
              if (data.text) {
                fullText += data.text
                setExpandedContent(fullText)
              }
            } catch {}
          }
        }
      }

      await supabase.from('notes').update({ ai_expanded_content: fullText }).eq('id', note!.id)
      setView('expanded')
    } catch (error) {
      console.error(error)
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
    doc.text(doc.splitTextToSize(textToExport, 170), 20, 35)
    doc.save(`${title || 'note'}.pdf`)
  }

  async function shareNote() {
    const excerpt = (displayContent || 'No content yet...').slice(0, 280)
    const payload = `${title || 'Untitled note'}\n\n${excerpt}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Untitled note',
          text: payload,
        })
        return
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(payload)}`, '_blank', 'noopener,noreferrer')
  }

  const displayContent = view === 'expanded' && expandedContent ? expandedContent : content

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 text-[#2c2f31]">
      <div className="flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
        <div className="space-y-3">
          <Link href="/notes" className="inline-flex items-center gap-2 text-sm font-bold text-[#595c5e] transition-colors hover:text-[#006094]">
            <ArrowLeft size={16} />
            Back to Notes
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#595c5e]">Writing Studio</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Write with clarity</h1>
            <p className="mt-2 text-sm text-[#595c5e]">
              {saving ? 'Saving your draft...' : saved ? 'All changes saved.' : 'Changes pending save.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleExpand}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#595c5e] transition-colors hover:bg-slate-50 hover:text-[#006094]"
          >
            {profile?.is_pro ? <Wand2 size={16} /> : <Lock size={16} />}
            {profile?.is_pro ? 'AI expand' : 'Pro only'}
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#006094] px-4 text-sm font-bold text-white shadow-lg shadow-[#006094]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Download size={16} />
            Export PDF
          </button>
          <button
            onClick={shareNote}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-[#595c5e] transition-colors hover:bg-slate-50 hover:text-[#006094]"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {expandedContent ? (
        <div className="inline-flex w-full flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm sm:w-fit">
          <button
            onClick={() => setView('raw')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${view === 'raw' ? 'bg-[#eef1f3] text-[#2c2f31]' : 'text-[#595c5e] hover:text-[#2c2f31]'}`}
          >
            Draft
          </button>
          <button
            onClick={() => setView('expanded')}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${view === 'expanded' ? 'bg-[#eef1f3] text-[#006094]' : 'text-[#595c5e] hover:text-[#006094]'}`}
          >
            AI Expanded
          </button>
        </div>
      ) : null}

      <div className="rounded-[32px] bg-white px-5 py-8 shadow-[0px_16px_50px_rgba(44,47,49,0.06)] sm:px-8 md:px-14 md:py-12 lg:px-20">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title..."
          className="mb-8 w-full border-none bg-transparent text-4xl font-black tracking-tight text-[#2c2f31] placeholder:text-[#595c5e]/35 focus:outline-none md:text-5xl"
        />

        {view === 'raw' ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Start writing your notes here..."
            className="min-h-[70vh] w-full resize-none border-none bg-transparent font-serif text-lg leading-9 text-[#2c2f31] placeholder:text-[#595c5e]/45 focus:outline-none md:text-[1.2rem]"
          />
        ) : (
          <div className="prose prose-slate max-w-none font-serif">
            {aiLoading ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, index) => (
                  <div key={index} className={`h-4 animate-pulse rounded bg-slate-200 ${index % 3 === 0 ? 'w-2/3' : 'w-full'}`} />
                ))}
              </div>
            ) : (
              <MarkdownRenderer content={expandedContent} />
            )}
          </div>
        )}
      </div>

      {showProModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowProModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <Sparkles size={28} className="mb-4 text-[#006094]" />
            <h2 className="mb-2 text-xl font-bold text-[#2c2f31]">
              AI writing is a Pro feature
            </h2>
            <p className="mb-6 text-sm text-[#595c5e]">
              Upgrade to Pro to expand rough notes into cleaner, more detailed study material.
            </p>

            <button className="mb-3 w-full rounded-xl bg-[#006094] py-3 font-bold text-white transition-colors hover:bg-[#005482]">
              Upgrade to Pro
            </button>

            <button
              onClick={() => setShowProModal(false)}
              className="w-full py-3 text-sm text-[#595c5e] transition-colors hover:text-[#2c2f31]"
            >
              Maybe later
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        if (line.startsWith('## ')) return <h2 key={index} className="mt-10 text-2xl font-bold text-[#006094]">{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={index} className="mt-8 text-3xl font-extrabold text-[#2c2f31]">{line.slice(2)}</h1>
        if (line.startsWith('### ')) return <h3 key={index} className="mt-6 text-xl font-bold text-[#2c2f31]">{line.slice(4)}</h3>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={index} className="ml-6 list-disc text-lg leading-8 text-[#2c2f31]">{line.slice(2)}</li>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={index} className="text-lg font-bold text-[#2c2f31]">{line.slice(2, -2)}</p>
        if (line === '') return <br key={index} />
        return <p key={index} className="text-lg leading-9 text-[#2c2f31]">{line}</p>
      })}
    </div>
  )
}
