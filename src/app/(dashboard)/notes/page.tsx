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
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-8 md:py-8">

        {/* Page Header Section */}
        <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between md:gap-6">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#595c5e] sm:text-xs">
              <span>Library</span>
              <ChevronRight size={12} className="text-[#595c5e]" />
              <span className="text-[#006094]">All Notes</span>
            </nav>

            <h1 className="text-2xl font-extrabold tracking-tight text-[#2c2f31] md:text-4xl">
              All Notes
            </h1>

            <p className="mt-2 max-w-lg text-sm text-[#595c5e] md:text-base">
              Manage your academic research, lecture summaries, and collaborative studies in one workspace.
            </p>
          </div>

          <button
            onClick={createNote}
            disabled={creating}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#006094] px-5 text-sm font-bold text-white shadow-lg shadow-[#006094]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:opacity-60 sm:w-auto sm:px-6 sm:text-base md:h-12"
          >
            <PlusCircle size={18} />
            {creating ? 'Creating...' : 'Create New Note'}
          </button>
        </div>

        {/* Editorial Filter Bar */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-[#eef1f3]/50 p-2 sm:mb-8 md:flex-row md:items-center md:justify-between md:gap-4">

          {/* Courses */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap px-1 no-scrollbar sm:px-2">
            <button
              onClick={() => setFilterCourse(null)}
              className={`flex h-10 items-center rounded-xl px-4 text-sm transition-colors md:px-5 ${
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
                  className={`flex h-10 items-center rounded-xl px-4 text-sm transition-colors md:px-5 ${
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
          <div className="flex items-center justify-between gap-3 px-1 sm:px-2">
            <div className="mx-1 hidden h-6 w-[1px] bg-[#abadaf]/30 md:block" />
            <button className="flex h-10 items-center gap-2 text-sm font-semibold text-[#595c5e] transition-colors hover:text-[#006094]">
              <ArrowUpDown size={16} />
              Sort: Recently Modified
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6 md:mb-8">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#595c5e]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your knowledge base..."
            className="h-11 w-full rounded-full border-none bg-[#eef1f3] pl-10 pr-4 text-sm transition-all focus:ring-2 focus:ring-[#4eadf4] md:h-12"
          />
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">

          {loading
            ? [...Array(6)].map((_, index) => (
              <div
                key={index}
                className="min-h-[240px] animate-pulse rounded-2xl border border-slate-100 bg-white md:min-h-[280px]"
              />
            ))
            : filtered.length === 0
              ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center lg:col-span-3 md:min-h-[280px] md:p-12">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef1f3] text-[#595c5e] md:h-16 md:w-16">
                    <FilePlus size={28} />
                  </div>

                  <div>
                    <h4 className="font-bold text-[#2c2f31]">New Knowledge Entry</h4>
                    <p className="mt-1 text-xs text-[#595c5e]">
                      Start a blank note or upload a PDF
                    </p>
                  </div>

                  <button
                    onClick={createNote}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-[#006094] px-5 text-sm font-semibold text-[#006094] transition-all hover:bg-[#006094]/10 md:h-11"
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
                    className="group relative flex min-h-[240px] cursor-pointer flex-col rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 sm:p-5 md:min-h-[280px] md:p-6"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${colorClass}`}>
                        <span className="w-2 h-2 rounded-full bg-[#006094]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {courseCode}
                        </span>
                      </div>

                      <span className="shrink-0 text-[11px] font-medium text-[#595c5e]">
                        {formatRelativeTime(note.updated_at)}
                      </span>
                    </div>

                    <h3 className="mb-3 line-clamp-2 text-lg font-bold leading-tight text-[#2c2f31] transition-colors group-hover:text-[#006094] md:text-xl">
                      {note.title || 'Untitled note'}
                    </h3>

                    <p className="flex-1 line-clamp-4 text-sm leading-relaxed text-[#595c5e]">
                      {truncate(note.raw_content || 'No content yet...', 180)}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-50 pt-5 md:mt-6 md:pt-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              if (profile?.is_pro) router.push(`/notes/${note.id}`)
                            }}
                            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
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
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#595c5e] transition-all hover:bg-[#eef1f3]"
                        >
                          <Share2 size={16} />
                        </button>
                      </div>

                      <button
                        onClick={e => e.stopPropagation()}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[#595c5e] transition-colors hover:bg-[#eef1f3] hover:text-[#006094]"
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
              className="group relative flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 p-6 transition-all duration-300 hover:border-[#4eadf4] hover:bg-[#006094]/5 md:min-h-[280px]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef1f3] text-[#595c5e] transition-all group-hover:scale-110 group-hover:bg-[#4eadf4] group-hover:text-[#002a44] md:h-16 md:w-16">
                <BookOpen size={28} />
              </div>

              <div className="text-center">
                <h4 className="font-bold text-[#2c2f31]">New Knowledge Entry</h4>
                <p className="mt-1 text-xs text-[#595c5e]">
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
