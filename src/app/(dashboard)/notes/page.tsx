'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PlusCircle, Plus, FilePlus, Sparkles, Share2, MoreHorizontal, ArrowUpDown, Search, Bell, Settings, ChevronRight, BookOpen, LayoutDashboard, Mic, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime, truncate } from '@/lib/utils'
import type { Note, Profile } from '@/types'

export default function NotesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [notesRes, profRes] = await Promise.all([
        supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      ])

      if (notesRes.data) setNotes(notesRes.data as Note[])
      if (profRes.data) setProfile(profRes.data as Profile)
      setLoading(false)
    }
    load()
  }, [])

  async function createNote() {
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('notes').insert({
      user_id: user.id,
      title: 'Untitled note',
      raw_content: '',
    }).select().single()

    if (data) router.push(`/notes/${data.id}`)
    setCreating(false)
  }

  const lowerSearch = search.trim().toLowerCase()
  const uniqueCourseCodes = Array.from(new Set(notes
    .map(n => (n as any)?.course_code || (n as any)?.courses?.course_code || '')
    .filter(Boolean)))

  const filtered = notes.filter(n => {
    const content = `${n.title || ''} ${n.raw_content || ''}`.toLowerCase()
    const matchesSearch = !lowerSearch || content.includes(lowerSearch)
    const noteCourse = (n as any)?.course_code || (n as any)?.courses?.course_code || ''
    const matchesCourse = !filterCourse || noteCourse === filterCourse
    return matchesSearch && matchesCourse
  })

  const courseColorClasses = [
    'bg-blue-100 text-blue-800',
    'bg-emerald-100 text-emerald-800',
    'bg-amber-100 text-amber-800',
    'bg-indigo-100 text-indigo-800',
  ]

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            <span>Library</span>
            <ChevronRight size={12} />
            <span className="text-primary">All Notes</span>
          </nav>
          <h1 className="text-4xl font-extrabold">All Notes</h1>
          <p className="text-slate-500 mt-2">Manage your academic research, lecture summaries, and collaborative studies in one workspace.</p>
        </div>
        <button onClick={createNote} disabled={creating}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-60">
          <PlusCircle size={18} /> {creating ? 'Creating...' : 'Create New Note'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div className="relative w-full lg:w-2/3">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your knowledge base..."
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilterCourse(null)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold ${!filterCourse ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>
            All Courses
          </button>
          <button className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-white/50 transition-colors">
            <ArrowUpDown size={16} /> Sort
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {uniqueCourseCodes.map(code => {
          const isActive = filterCourse === code
          return (
            <button key={code} onClick={() => setFilterCourse(isActive ? null : code)}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${isActive ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>
              {code}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? [...Array(6)].map((_, index) => (
            <div key={index} className="h-56 rounded-2xl border border-surface-variant bg-white animate-pulse" />
          ))
          : filtered.length === 0
            ? (
              <div className="lg:col-span-3 flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-2xl text-center">
                <div className="w-16 h-16 rounded-full border-2 border-slate-300 flex items-center justify-center mb-4">
                  <FilePlus size={28} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
                <p className="text-slate-500 text-sm mb-4">No notes yet. Create your first one.</p>
                <button onClick={createNote} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-dashed border-primary text-primary text-sm font-semibold hover:bg-primary/10 transition-all">
                  <Plus size={16} /> Create note
                </button>
              </div>
            )
            : filtered.map((note, i) => {
              const courseCode = (note as any).course_code || (note as any).courses?.course_code || 'Unassigned'
              const colorClass = courseColorClasses[i % 4]
              return (
                <motion.article key={note.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => router.push(`/notes/${note.id}`)}
                  className="bg-white border border-surface-variant rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${colorClass}`}>{courseCode}</span>
                    <span className="text-xs text-slate-500">{formatRelativeTime(note.updated_at)}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">{note.title || 'Untitled note'}</h3>
                  <p className="text-sm text-slate-500 line-clamp-3 mb-4">{truncate(note.raw_content || 'No content yet...', 120)}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); if (profile?.is_pro) router.push(`/notes/${note.id}`) }}
                        className={`w-9 h-9 rounded-lg grid place-items-center ${profile?.is_pro ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                        <Sparkles size={16} />
                      </button>
                      <button onClick={e => e.stopPropagation()} className="w-9 h-9 rounded-lg grid place-items-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Share2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {note.ai_expanded_content && <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">AI</span>}
                      <button onClick={e => e.stopPropagation()} className="p-1.5 text-slate-500 hover:text-slate-700">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              )
            })
        }
      </div>

      <button onClick={createNote}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center z-50">
        <PlusCircle size={24} />
      </button>
    </div>
  )
}

