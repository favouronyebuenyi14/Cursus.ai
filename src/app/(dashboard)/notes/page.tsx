'use client'

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import jsPDF from 'jspdf'
import {
  ArrowLeft, BookOpen, ChevronRight, Download, FilePlus, FileText,
  FolderOpen, Home, Mic, MoreHorizontal, Plus, Printer, Search,
  Share2, Sparkles, User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime, truncate } from '@/lib/utils'
import type { Course, Note, Profile } from '@/types'

export default function NotesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const selectedCourseId = searchParams.get('course')

  const [courses, setCourses] = useState<Course[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creatingCourseId, setCreatingCourseId] = useState<string | null>(null)
  const [openCourseMenuId, setOpenCourseMenuId] = useState<string | null>(null)
  const [openNoteMenuId, setOpenNoteMenuId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [coursesRes, notesRes, profileRes] = await Promise.all([
        supabase.from('courses').select('*').eq('user_id', user.id).order('course_code', { ascending: true }),
        supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      ])

      if (coursesRes.data) setCourses(coursesRes.data as Course[])
      if (notesRes.data) setNotes(notesRes.data as Note[])
      if (profileRes.data) setProfile(profileRes.data as Profile)
      setLoading(false)
    }

    load()
  }, [supabase])

  useEffect(() => {
    function closeMenus() {
      setOpenCourseMenuId(null)
      setOpenNoteMenuId(null)
    }
    window.addEventListener('click', closeMenus)
    return () => window.removeEventListener('click', closeMenus)
  }, [])

  const selectedCourse = courses.find(course => course.id === selectedCourseId) || null
  const lowerSearch = search.trim().toLowerCase()
  const courseNotesMap = useMemo(
    () => new Map(courses.map(course => [course.id, notes.filter(note => note.course_id === course.id)])),
    [courses, notes],
  )

  const visibleCourses = courses.filter(course =>
    !lowerSearch || `${course.course_code} ${course.course_name}`.toLowerCase().includes(lowerSearch),
  )
  const visibleNotes = notes.filter(note =>
    (!selectedCourseId || note.course_id === selectedCourseId) &&
    (!lowerSearch || `${note.title || ''} ${note.raw_content || ''}`.toLowerCase().includes(lowerSearch)),
  )

  async function createNote(courseId: string) {
    setCreatingCourseId(courseId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const course = courses.find(item => item.id === courseId)
    const { data } = await supabase.from('notes').insert({
      user_id: user.id,
      course_id: courseId,
      title: course ? `${course.course_code} note` : 'Untitled note',
      raw_content: '',
    }).select().single()
    if (data) router.push(`/notes/${data.id}`)
    setCreatingCourseId(null)
  }

  function openCourse(courseId: string) {
    router.push(`/notes?course=${courseId}`)
  }

  async function createNoteAndRecord(courseId?: string) {
    const targetCourseId = courseId || courses[0]?.id
    if (!targetCourseId) {
      alert("Please create a course first.")
      return
    }
    setCreatingCourseId(targetCourseId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const course = courses.find(item => item.id === targetCourseId)
    const { data } = await supabase.from('notes').insert({
      user_id: user.id,
      course_id: targetCourseId,
      title: course ? `${course.course_code} audio note` : 'Audio note',
      raw_content: '',
    }).select().single()
    if (data) router.push(`/notes/${data.id}?record=true`)
    setCreatingCourseId(null)
  }

  async function shareNote(note: Note) {
    const text = `${note.title || 'Untitled note'}\n\n${truncate(note.raw_content || 'No content yet...', 280)}`
    if (navigator.share) {
      try {
        await navigator.share({ title: note.title || 'Untitled note', text })
        return
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  function printNote(note: Note) {
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
    if (!popup) return
    const title = escapeHtml(note.title || 'Untitled note')
    const body = escapeHtml(note.raw_content || 'No content yet...').replace(/\n/g, '<br />')
    popup.document.write(`<html><head><title>${title}</title></head><body style="font-family:Arial,sans-serif;padding:32px"><h1>${title}</h1><div style="line-height:1.6">${body}</div></body></html>`)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  function exportDoc(note: Note) {
    const html = `<html><body><h1>${escapeHtml(note.title || 'Untitled note')}</h1><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(note.raw_content || 'No content yet...')}</pre></body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sanitizeFileName(note.title || 'note')}.doc`
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf(note: Note) {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(note.title || 'Untitled note', 20, 20)
    doc.setFontSize(11)
    doc.text(doc.splitTextToSize(note.raw_content || 'No content yet...', 170), 20, 35)
    doc.save(`${sanitizeFileName(note.title || 'note')}.pdf`)
  }

  const badgeClasses = ['bg-[#c1d2f3]/30 text-[#374862]', 'bg-emerald-100 text-emerald-800', 'bg-amber-100 text-amber-800', 'bg-indigo-100 text-indigo-800']

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <div className="mb-8 flex flex-col gap-5 md:mb-10">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#595c5e] sm:text-xs">
              <span>Library</span>
              <ChevronRight size={12} className="text-[#595c5e]" />
              <span className="text-[#006094]">{selectedCourse ? selectedCourse.course_code : 'Smart Notes'}</span>
            </nav>
            {selectedCourse ? (
              <>
                <button onClick={() => router.push('/notes')} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#595c5e] transition-colors hover:text-[#006094]">
                  <ArrowLeft size={16} />
                  Back to Courses
                </button>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#2c2f31] md:text-4xl">{selectedCourse.course_code} Notes</h1>
                <p className="mt-2 max-w-2xl text-sm text-[#595c5e] md:text-base">{selectedCourse.course_name}</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#2c2f31] md:text-4xl">Your Courses</h1>
                <p className="mt-2 max-w-2xl text-sm text-[#595c5e] md:text-base">Choose a course first, then create notes, record material, or manage note-level actions inside that course.</p>
              </>
            )}
          </div>
        </div>

        <div className="relative mb-6 md:mb-8">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#595c5e]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={selectedCourse ? 'Search notes in this course...' : 'Search your courses...'}
            className="h-11 w-full rounded-full border-none bg-[#eef1f3] pl-10 pr-4 text-sm transition-all focus:ring-2 focus:ring-[#4eadf4] md:h-12"
          />
        </div>

        {!selectedCourse ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {loading ? [...Array(6)].map((_, index) => <div key={index} className="min-h-[220px] animate-pulse rounded-2xl border border-slate-100 bg-white" />) : null}
            {!loading && visibleCourses.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={28} />}
                title="No courses found"
                body="Add courses during onboarding or adjust your search to see your notes hub."
              />
            ) : null}
            {!loading && visibleCourses.map((course, index) => {
              const courseNotes = courseNotesMap.get(course.id) || []
              const isMenuOpen = openCourseMenuId === course.id
              return (
                <motion.article
                  key={course.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => openCourse(course.id)}
                  className="group relative flex min-h-[220px] cursor-pointer flex-col rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 md:p-6"
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <Badge text={course.course_code} className={badgeClasses[index % badgeClasses.length]} />
                    <div className="relative">
                      <MenuButton onClick={event => {
                        event.stopPropagation()
                        setOpenNoteMenuId(null)
                        setOpenCourseMenuId(current => current === course.id ? null : course.id)
                      }} />
                      {isMenuOpen ? (
                        <MenuPanel onClick={event => event.stopPropagation()}>
                          <MenuAction icon={<Plus size={16} />} label={creatingCourseId === course.id ? 'Creating...' : 'Add note'} onClick={() => createNote(course.id)} />
                          <MenuAction icon={<Mic size={16} />} label="Record note" onClick={() => createNoteAndRecord(course.id)} />
                        </MenuPanel>
                      ) : null}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold leading-tight text-[#2c2f31] transition-colors group-hover:text-[#006094]">{course.course_name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#595c5e]">
                    {courseNotes.length === 0 ? 'No notes yet. Start with a fresh note or record material for this course.' : `${courseNotes.length} note${courseNotes.length === 1 ? '' : 's'} ready in this workspace.`}
                  </p>
                  <div className="mt-auto border-t border-slate-100 pt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#595c5e]">Open course workspace</span>
                      <FolderOpen size={18} className="text-[#006094]" />
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {loading ? [...Array(6)].map((_, index) => <div key={index} className="min-h-[240px] animate-pulse rounded-2xl border border-slate-100 bg-white md:min-h-[280px]" />) : null}
            {!loading && visibleNotes.length === 0 ? (
              <div className="lg:col-span-3">
                <EmptyState
                  icon={<FilePlus size={28} />}
                  title="No notes in this course yet"
                  body={`Create your first note for ${selectedCourse.course_code} or record new material.`}
                  actions={
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button onClick={() => createNote(selectedCourse.id)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-[#006094] px-5 text-sm font-semibold text-[#006094] transition-all hover:bg-[#006094]/10 md:h-11">
                        <Plus size={16} /> Create note
                      </button>
                      <button onClick={() => createNoteAndRecord(selectedCourse.id)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#eef1f3] px-5 text-sm font-semibold text-[#2c2f31] transition-all hover:bg-slate-200 md:h-11">
                        <Mic size={16} /> Record note
                      </button>
                    </div>
                  }
                />
              </div>
            ) : null}
            {!loading && visibleNotes.map((note, index) => {
              const isMenuOpen = openNoteMenuId === note.id
              return (
                <motion.article
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => router.push(`/notes/${note.id}`)}
                  className="group relative flex min-h-[240px] cursor-pointer flex-col rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 sm:p-5 md:min-h-[280px] md:p-6"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <Badge text={selectedCourse.course_code} className={badgeClasses[index % badgeClasses.length]} />
                    <span className="shrink-0 text-[11px] font-medium text-[#595c5e]">{formatRelativeTime(note.updated_at)}</span>
                  </div>
                  <h3 className="mb-3 line-clamp-2 text-lg font-bold leading-tight text-[#2c2f31] transition-colors group-hover:text-[#006094] md:text-xl">{note.title || 'Untitled note'}</h3>
                  <p className="flex-1 line-clamp-4 text-sm leading-relaxed text-[#595c5e]">{truncate(note.raw_content || 'No content yet...', 180)}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-50 pt-5 md:mt-6 md:pt-6">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <button
                          onClick={event => {
                            event.stopPropagation()
                            if (profile?.is_pro) router.push(`/notes/${note.id}`)
                          }}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${profile?.is_pro ? 'bg-[#91f78e]/30 text-[#006b1b] hover:bg-[#006b1b] hover:text-white' : 'cursor-not-allowed bg-slate-100 text-slate-300'}`}
                        >
                          <Sparkles size={16} />
                        </button>
                        {profile?.is_pro ? <span className="absolute -top-1 -right-1 flex h-4 w-6 items-center justify-center rounded bg-[#006094] text-[8px] font-black text-white">PRO</span> : null}
                      </div>
                      <button
                        onClick={event => {
                          event.stopPropagation()
                          void shareNote(note)
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[#595c5e] transition-all hover:bg-[#eef1f3] hover:text-[#006094]"
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                    <div className="relative">
                      <MenuButton onClick={event => {
                        event.stopPropagation()
                        setOpenCourseMenuId(null)
                        setOpenNoteMenuId(current => current === note.id ? null : note.id)
                      }} />
                      {isMenuOpen ? (
                        <MenuPanel onClick={event => event.stopPropagation()}>
                          <MenuAction icon={<BookOpen size={16} />} label="Open note" onClick={() => router.push(`/notes/${note.id}`)} />
                          <MenuAction icon={<Printer size={16} />} label="Print note" onClick={() => printNote(note)} />
                          <MenuAction icon={<Download size={16} />} label="Save as PDF" onClick={() => exportPdf(note)} />
                          <MenuAction icon={<FileText size={16} />} label="Save as Docs" onClick={() => exportDoc(note)} />
                          <MenuAction icon={<Share2 size={16} />} label="Share note" onClick={() => void shareNote(note)} />
                        </MenuPanel>
                      ) : null}
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        )}
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-slate-200 bg-white/90 py-3 backdrop-blur-xl">
        <button onClick={() => router.push('/dashboard')} className="flex flex-col items-center gap-1 text-[#595c5e]"><Home size={22} /><span className="text-[10px] font-bold">Home</span></button>
        <button onClick={() => router.push('/notes')} className="flex flex-col items-center gap-1 text-[#006094]"><BookOpen size={22} /><span className="text-[10px] font-bold">Notes</span></button>
        <button onClick={() => createNoteAndRecord(selectedCourse?.id)} className="flex flex-col items-center gap-1 text-[#595c5e]"><Mic size={22} /><span className="text-[10px] font-bold">Record</span></button>
        <button onClick={() => router.push('/profile')} className="flex flex-col items-center gap-1 text-[#595c5e]"><User size={22} /><span className="text-[10px] font-bold">Profile</span></button>
      </nav>
    </div>
  )
}

function Badge({ text, className }: { text: string, className: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${className}`}>
      <span className="h-2 w-2 rounded-full bg-[#006094]" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{text}</span>
    </div>
  )
}

function MenuButton({ onClick }: { onClick: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-lg text-[#595c5e] transition-colors hover:bg-[#eef1f3] hover:text-[#006094]">
      <MoreHorizontal size={16} />
    </button>
  )
}

function MenuPanel({ children, onClick }: { children: ReactNode, onClick: (event: MouseEvent<HTMLDivElement>) => void }) {
  return <div onClick={onClick} className="absolute right-0 top-12 z-20 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">{children}</div>
}

function MenuAction({ icon, label, onClick }: { icon: ReactNode, label: string, onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#2c2f31] transition-colors hover:bg-[#eef1f3]">{icon}{label}</button>
}

function EmptyState({ icon, title, body, actions }: { icon: ReactNode, title: string, body: string, actions?: ReactNode }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center md:min-h-[280px] md:p-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef1f3] text-[#595c5e] md:h-16 md:w-16">{icon}</div>
      <div>
        <h4 className="font-bold text-[#2c2f31]">{title}</h4>
        <p className="mt-1 text-xs text-[#595c5e]">{body}</p>
      </div>
      {actions}
    </div>
  )
}

function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || 'note'
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
