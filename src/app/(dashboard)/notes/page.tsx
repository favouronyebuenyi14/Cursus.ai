'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  PlusCircle,
  Plus,
  FilePlus,
  Sparkles,
  Share2,
  MoreHorizontal,
  ArrowUpDown,
  Search,
  ChevronRight,
  Home,
  Mic,
  User,
  BookOpen,
} from 'lucide-react'
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
    'bg-[#c1d2f3]/30 text-[#374862]',
    'bg-emerald-100 text-emerald-800',
    'bg-amber-100 text-amber-800',
    'bg-indigo-100 text-indigo-800',
  ]

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="p-8 max-w-7xl mx-auto">

        {/* Page Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <nav className="flex items-center gap-2 text-xs font-bold text-[#595c5e] uppercase tracking-widest mb-2">
              <span>Library</span>
              <ChevronRight size={12} className="text-[#595c5e]" />
              <span className="text-[#006094]">All Notes</span>
            </nav>

            <h1 className="text-4xl font-extrabold text-[#2c2f31] tracking-tight">
              All Notes
            </h1>

            <p className="text-[#595c5e] mt-2 max-w-lg">
              Manage your academic research, lecture summaries, and collaborative studies in one workspace.
            </p>
          </div>

          <button
            onClick={createNote}
            disabled={creating}
            className="bg-[#006094] text-white px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#006094]/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60"
          >
            <PlusCircle size={18} />
            {creating ? 'Creating...' : 'Create New Note'}
          </button>
        </div>

        {/* Editorial Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[#eef1f3]/50 p-2 rounded-2xl">

          {/* Courses */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap px-2 no-scrollbar">
            <button
              onClick={() => setFilterCourse(null)}
              className={`px-5 py-2.5 rounded-xl text-sm transition-colors ${
                !filterCourse
                  ? 'bg-white text-[#006094] font-bold shadow-sm'
                  : 'hover:bg-white/50 text-[#595c5e] font-semibold'
              }`}
            >
              All Courses
            </button>

            {uniqueCourseCodes.map(code => {
              const isActive = filterCourse === code
              return (
                <button
                  key={code}
                  onClick={() => setFilterCourse(isActive ? null : code)}
                  className={`px-5 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive
                      ? 'bg-white text-[#006094] font-bold shadow-sm'
                      : 'hover:bg-white/50 text-[#595c5e] font-semibold'
                  }`}
                >
                  {code}
                </button>
              )
            })}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3 px-2">
            <div className="h-6 w-[1px] bg-[#abadaf]/30 mx-2" />
            <button className="flex items-center gap-2 text-sm font-semibold text-[#595c5e] hover:text-[#006094] transition-colors">
              <ArrowUpDown size={16} />
              Sort: Recently Modified
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#595c5e]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your knowledge base..."
            className="w-full bg-[#eef1f3] border-none rounded-full pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#4eadf4] transition-all"
          />
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {loading
            ? [...Array(6)].map((_, index) => (
              <div
                key={index}
                className="min-h-[280px] rounded-2xl border border-slate-100 bg-white animate-pulse"
              />
            ))
            : filtered.length === 0
              ? (
                <div className="lg:col-span-3 flex flex-col items-center justify-center min-h-[280px] gap-4 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#eef1f3] flex items-center justify-center text-[#595c5e]">
                    <FilePlus size={28} />
                  </div>

                  <div>
                    <h4 className="font-bold text-[#2c2f31]">New Knowledge Entry</h4>
                    <p className="text-xs text-[#595c5e] mt-1">
                      Start a blank note or upload a PDF
                    </p>
                  </div>

                  <button
                    onClick={createNote}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-dashed border-[#006094] text-[#006094] text-sm font-semibold hover:bg-[#006094]/10 transition-all"
                  >
                    <Plus size={16} /> Create note
                  </button>
                </div>
              )
              : filtered.map((note, i) => {
                const courseCode = (note as any).course_code || (note as any).courses?.course_code || 'Unassigned'
                const colorClass = courseColorClasses[i % 4]

                return (
                  <motion.article
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => router.push(`/notes/${note.id}`)}
                    className="group relative bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col min-h-[280px] cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${colorClass}`}>
                        <span className="w-2 h-2 rounded-full bg-[#006094]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {courseCode}
                        </span>
                      </div>

                      <span className="text-[11px] font-medium text-[#595c5e]">
                        {formatRelativeTime(note.updated_at)}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-[#2c2f31] group-hover:text-[#006094] transition-colors mb-3 leading-tight line-clamp-2">
                      {note.title || 'Untitled note'}
                    </h3>

                    <p className="text-[#595c5e] text-sm leading-relaxed line-clamp-4 flex-1">
                      {truncate(note.raw_content || 'No content yet...', 180)}
                    </p>

                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              if (profile?.is_pro) router.push(`/notes/${note.id}`)
                            }}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                              profile?.is_pro
                                ? 'bg-[#91f78e]/30 text-[#006b1b] hover:bg-[#006b1b] hover:text-white'
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                          >
                            <Sparkles size={16} />
                          </button>

                          {profile?.is_pro && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-6 items-center justify-center rounded bg-[#006094] text-[8px] font-black text-white">
                              PRO
                            </span>
                          )}
                        </div>

                        <button
                          onClick={e => e.stopPropagation()}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-[#595c5e] hover:bg-[#eef1f3] transition-all"
                        >
                          <Share2 size={16} />
                        </button>
                      </div>

                      <button
                        onClick={e => e.stopPropagation()}
                        className="p-2 text-[#595c5e] hover:text-[#006094] transition-colors"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </motion.article>
                )
              })
          }

          {/* Decorative Add Card (Bento Style) */}
          {!loading && filtered.length > 0 && (
            <button
              onClick={createNote}
              className="group relative border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-[#4eadf4] hover:bg-[#006094]/5 transition-all duration-300 flex flex-col items-center justify-center min-h-[280px] gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-[#eef1f3] flex items-center justify-center text-[#595c5e] group-hover:scale-110 group-hover:bg-[#4eadf4] group-hover:text-[#002a44] transition-all">
                <BookOpen size={28} />
              </div>

              <div className="text-center">
                <h4 className="font-bold text-[#2c2f31]">New Knowledge Entry</h4>
                <p className="text-xs text-[#595c5e] mt-1">
                  Start a blank note or upload a PDF
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Floating Mobile FAB */}
      <button
        onClick={createNote}
        className="md:hidden fixed bottom-20 right-6 w-14 h-14 bg-[#006094] text-white rounded-full shadow-2xl flex items-center justify-center z-50"
      >
        <PlusCircle size={24} />
      </button>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 flex justify-around items-center py-3 z-40">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex flex-col items-center gap-1 text-[#595c5e]"
        >
          <Home size={22} />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button
          onClick={() => router.push('/notes')}
          className="flex flex-col items-center gap-1 text-[#006094]"
        >
          <BookOpen size={22} />
          <span className="text-[10px] font-bold">Notes</span>
        </button>

        <button
          onClick={() => router.push('/recorder')}
          className="flex flex-col items-center gap-1 text-[#595c5e]"
        >
          <Mic size={22} />
          <span className="text-[10px] font-bold">Record</span>
        </button>

        <button
          onClick={() => router.push('/profile')}
          className="flex flex-col items-center gap-1 text-[#595c5e]"
        >
          <User size={22} />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>
    </div>
  )
}