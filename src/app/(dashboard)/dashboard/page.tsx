'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Mic,
  FileText,
  Target,
  Camera,
  ArrowRight,
  Calendar,
  Plus,
  MoreHorizontal,
  CalendarDays,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Note, Profile, Recording } from '@/types'
import NotificationBell from '@/components/NotificationBell'
import CalendarModal, { type CalendarEvent } from '@/components/CalendarModal'

const QUICK_ACTIONS = [
  { href: '/notes', icon: BookOpen, label: 'New Note', color: 'text-[#006094]', bg: 'bg-[#4eadf4]/20' },
  { action: 'record', icon: Mic, label: 'New Recording', color: 'text-[#4b5c78]', bg: 'bg-[#c1d2f3]/30' },
  { href: '/library', icon: FileText, label: 'Upload PDF', color: 'text-[#006b1b]', bg: 'bg-[#91f78e]/30' },
  { href: '/snap', icon: Camera, label: 'Snap a Question', color: 'text-[#006094]', bg: 'bg-[#006094]/10' },
]

const EVENT_TYPE_COLORS: Record<CalendarEvent['event_type'], { dot: string; label: string }> = {
  exam:     { dot: 'bg-red-500',    label: 'Exam' },
  class:    { dot: 'bg-[#006094]',  label: 'Class' },
  deadline: { dot: 'bg-orange-500', label: 'Deadline' },
  other:    { dot: 'bg-[#4b5c78]',  label: 'Event' },
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getDaysLeft(eventDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(eventDate + 'T00:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function getNextEvent(events: CalendarEvent[]): CalendarEvent | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const future = events
    .filter(ev => new Date(ev.event_date + 'T00:00:00') >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
  return future[0] || null
}

export default function DashboardHome() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [stats, setStats] = useState({ notes: 0, recordings: 0, documents: 0 })
  const [recentNotes, setRecentNotes] = useState<Note[]>([])
  const [recentRecordings, setRecentRecordings] = useState<Recording[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showCalendar, setShowCalendar] = useState(false)
  const [eventsMenuOpen, setEventsMenuOpen] = useState(false)
  const eventsMenuRef = useRef<HTMLDivElement>(null)

  const todayDate = new Date().toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const [profRes, notesRes, recsRes, docsRes, eventsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(4),
        supabase.from('recordings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('documents').select('count').eq('user_id', user.id),
        supabase.from('events').select('*').eq('user_id', user.id).order('event_date', { ascending: true }),
      ])

      if (profRes.data) setProfile(profRes.data as Profile)
      if (notesRes.data) setRecentNotes(notesRes.data as Note[])
      if (recsRes.data) setRecentRecordings(recsRes.data as Recording[])
      if (eventsRes.data) setEvents(eventsRes.data as CalendarEvent[])

      setStats({
        notes: notesRes.data?.length || 0,
        recordings: recsRes.data?.length || 0,
        documents: (docsRes.data as any)?.[0]?.count || 0,
      })
    }

    load()
  }, [supabase])

  // Close events menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (eventsMenuRef.current && !eventsMenuRef.current.contains(e.target as Node)) {
        setEventsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function clearPastEvents() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().slice(0, 10)
    await supabase.from('events').delete().eq('user_id', userId).lt('event_date', todayStr)
    setEvents(prev => prev.filter(ev => ev.event_date >= todayStr))
    setEventsMenuOpen(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const nextEvent = getNextEvent(events)

  const todayStr = new Date().toISOString().slice(0, 10)
  const upcomingEvents = events
    .filter(ev => ev.event_date >= todayStr)
    .slice(0, 3)

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#2c2f31] md:space-y-8">
      <div className="flex items-center justify-end gap-2 sm:gap-3">
        {userId && <NotificationBell userId={userId} />}
        <button
          onClick={() => router.push('/notes')}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all hover:bg-primary hover:text-white"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
            Good {getGreeting()},{' '}
            <button
              onClick={() => router.push('/profile')}
              className="inline text-inherit underline decoration-transparent transition-colors hover:text-[#006094] hover:decoration-[#006094]"
            >
              {firstName}
            </button>
          </h2>

          <p className="mt-1 text-sm font-medium text-[#595c5e] md:text-base">
            {profile?.department && profile?.level
              ? `${profile.department} · ${profile.level} · ${profile.university}`
              : 'Ready to tackle your academic goals today?'}
          </p>
        </div>

        <div className="flex w-full items-center gap-3 rounded-xl border border-[#abadaf]/10 bg-white px-4 py-3 shadow-sm sm:w-auto">
          <Calendar size={18} className="text-[#006094]" />
          <span className="text-sm font-semibold">{todayDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8 md:space-y-8">
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <span className="h-6 w-1.5 rounded-full bg-[#006094]" />
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.label}
                  onClick={() => {
                    if (action.action === 'record') {
                      router.push('/notes')
                    } else if (action.href) {
                      router.push(action.href)
                    }
                  }}
                  className="group flex min-h-[132px] flex-col items-center justify-center rounded-xl border border-[#abadaf]/10 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-6"
                >
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${action.bg} transition-transform group-hover:scale-110`}>
                    <action.icon size={22} className={action.color} />
                  </div>
                  <span className="text-center text-sm font-bold text-[#2c2f31]">{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <span className="h-6 w-1.5 rounded-full bg-[#4b5c78]" />
              Academic Progress
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              <div className="group relative overflow-hidden rounded-xl bg-[#006094] p-5 text-[#ebf3ff] shadow-sm md:p-6">
                <div className="relative z-10">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider opacity-80">Notes Written</p>
                  <p className="text-3xl font-black sm:text-4xl">{stats.notes}</p>
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(stats.notes * 10, 100)}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] font-medium opacity-80">Keep writing!</p>
                </div>
                <BookOpen className="absolute -bottom-4 -right-4 text-white/10 transition-transform group-hover:rotate-12" size={96} />
              </div>

              <div className="group relative overflow-hidden rounded-xl bg-[#4b5c78] p-5 text-[#eef2ff] shadow-sm md:p-6">
                <div className="relative z-10">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider opacity-80">Recordings Made</p>
                  <p className="text-3xl font-black sm:text-4xl">{stats.recordings}</p>
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(stats.recordings * 10, 100)}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] font-medium opacity-80">Record your lectures</p>
                </div>
                <Mic className="absolute -bottom-4 -right-4 text-white/10 transition-transform group-hover:rotate-12" size={96} />
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-[#abadaf]/10 bg-white p-5 shadow-sm md:p-6">
                <div className="relative z-10">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#595c5e]">PDFs Analyzed</p>
                  <p className="text-3xl font-black text-[#006094] sm:text-4xl">{stats.documents}</p>
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[#4eadf4]/30">
                    <div className="h-full rounded-full bg-[#006094]" style={{ width: `${Math.min(stats.documents * 10, 100)}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] font-medium text-[#595c5e]">Upload your first PDF</p>
                </div>
                <FileText className="absolute -bottom-4 -right-4 text-[#006094]/5 transition-transform group-hover:rotate-12" size={96} />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <span className="h-6 w-1.5 rounded-full bg-[#006b1b]" />
                Recent Activity
              </h3>
              <Link href="/notes" className="text-sm font-bold text-[#006094] hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {recentNotes.length === 0 && recentRecordings.length === 0 ? (
                <div className="rounded-xl border border-[#abadaf]/10 bg-white p-6 text-center md:p-8">
                  <BookOpen size={32} className="mx-auto mb-3 text-[#abadaf]" />
                  <p className="mb-1 text-sm font-bold text-[#2c2f31]">No activity yet</p>
                  <p className="mb-4 text-xs text-[#595c5e]">Start by creating a note or recording a lecture</p>
                  <button
                    onClick={() => router.push('/notes')}
                    className="h-10 rounded-lg bg-[#006094] px-4 text-sm font-bold text-white transition-colors hover:bg-[#005482]"
                  >
                    Create New Note
                  </button>
                </div>
              ) : (
                <>
                  {recentNotes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => router.push(`/notes/${note.id}`)}
                      className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#abadaf]/5 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#4eadf4]/10">
                          <BookOpen size={18} className="text-[#006094]" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#2c2f31]">{note.title || 'Untitled note'}</p>
                          <p className="text-xs text-[#595c5e]">{formatRelativeTime(note.updated_at)}</p>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-[#abadaf] transition-colors group-hover:text-[#006094]" />
                    </div>
                  ))}

                  {recentRecordings.map(recording => (
                    <div
                      key={recording.id}
                      onClick={() => router.push('/notes')}
                      className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#abadaf]/5 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#c1d2f3]/20">
                          <Mic size={18} className="text-[#4b5c78]" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#2c2f31]">{recording.title || 'Untitled recording'}</p>
                          <p className="text-xs text-[#595c5e]">{formatRelativeTime(recording.created_at)}</p>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-[#abadaf] transition-colors group-hover:text-[#4b5c78]" />
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-4">
          {/* ── Active Countdown ── */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#006094] to-[#005482] p-6 text-white shadow-xl md:p-8">
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-md">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#91f78e]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Active Countdown</span>
              </div>

              {nextEvent ? (
                <>
                  <h4 className="mb-1 text-xl font-black leading-tight">{nextEvent.title}</h4>
                  <p className="mb-6 text-sm text-white/80 capitalize">
                    {EVENT_TYPE_COLORS[nextEvent.event_type].label}
                    {nextEvent.event_time ? ` · ${nextEvent.event_time}` : ''}
                    {nextEvent.location ? ` · ${nextEvent.location}` : ''}
                  </p>

                  <div className="flex items-baseline gap-2">
                    {(() => {
                      const days = getDaysLeft(nextEvent.event_date)
                      if (days === 0) return <span className="text-5xl font-black tracking-tighter sm:text-6xl">Today!</span>
                      if (days === 1) return (
                        <>
                          <span className="text-5xl font-black tracking-tighter sm:text-6xl">1</span>
                          <span className="text-xl font-bold opacity-70">day left</span>
                        </>
                      )
                      return (
                        <>
                          <span className="text-5xl font-black tracking-tighter sm:text-6xl">{days}</span>
                          <span className="text-xl font-bold opacity-70">days left</span>
                        </>
                      )
                    })()}
                  </div>

                  <button
                    onClick={() => router.push(nextEvent.event_type === 'exam' ? '/exam-prep' : '/notes')}
                    className="mt-8 h-11 w-full rounded-xl bg-white font-bold text-[#006094] shadow-lg transition-colors hover:bg-slate-50 md:h-12"
                  >
                    {nextEvent.event_type === 'exam' ? 'Start Study Prep' : 'Open Notes'}
                  </button>
                </>
              ) : (
                <>
                  <h4 className="mb-1 text-xl font-black leading-tight">No upcoming events</h4>
                  <p className="mb-6 text-sm text-white/80">Add events to your calendar to start tracking</p>
                  <button
                    onClick={() => setShowCalendar(true)}
                    className="mt-2 h-11 w-full rounded-xl bg-white font-bold text-[#006094] shadow-lg transition-colors hover:bg-slate-50 md:h-12"
                  >
                    Open Calendar
                  </button>
                </>
              )}
            </div>
            <Target className="absolute -right-10 -top-10 text-white/10" size={180} />
          </div>

          {/* ── Upcoming Events ── */}
          <div className="space-y-4 rounded-xl bg-[#eef1f3] p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#2c2f31]">Upcoming Events</h4>

              <div ref={eventsMenuRef} className="relative">
                <button
                  id="events-menu-btn"
                  onClick={() => setEventsMenuOpen(o => !o)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#595c5e] transition-colors hover:bg-white hover:text-[#2c2f31]"
                  aria-label="Events options"
                >
                  <MoreHorizontal size={18} />
                </button>

                {eventsMenuOpen && (
                  <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-xl border border-[#abadaf]/15 bg-white shadow-xl">
                    <button
                      onClick={() => { setShowCalendar(true); setEventsMenuOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-[#2c2f31] hover:bg-[#f5f7f9]"
                    >
                      <Plus size={15} className="text-[#006094]" />
                      Add New Event
                    </button>
                    <button
                      onClick={() => { setShowCalendar(true); setEventsMenuOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-[#2c2f31] hover:bg-[#f5f7f9]"
                    >
                      <CalendarDays size={15} className="text-[#4b5c78]" />
                      View Full Calendar
                    </button>
                    <div className="mx-4 my-0.5 h-px bg-[#abadaf]/15" />
                    <button
                      onClick={clearPastEvents}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                      Clear Past Events
                    </button>
                  </div>
                )}
              </div>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#abadaf]/30 bg-white p-4 text-center">
                <Calendar size={20} className="mx-auto mb-2 text-[#abadaf]" />
                <p className="text-xs font-bold text-[#595c5e]">No upcoming events</p>
                <button
                  onClick={() => setShowCalendar(true)}
                  className="mt-2 text-xs font-bold text-[#006094] hover:underline"
                >
                  Add your first event →
                </button>
              </div>
            ) : (
              upcomingEvents.map(ev => {
                const [, m, d] = ev.event_date.split('-').map(Number)
                const meta = EVENT_TYPE_COLORS[ev.event_type]
                return (
                  <div key={ev.id} className="flex gap-3 rounded-lg border border-[#abadaf]/5 bg-white p-3 sm:gap-4">
                    <div className="min-w-[3rem] text-center">
                      <p className="text-xs font-bold uppercase text-[#595c5e]">{MONTHS_SHORT[m - 1]}</p>
                      <p className="text-xl font-black text-[#006094]">{d}</p>
                    </div>
                    <div className="border-l border-[#abadaf]/10 pl-4 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        <p className="truncate text-sm font-bold text-[#2c2f31]">{ev.title}</p>
                      </div>
                      <p className="text-xs text-[#595c5e]">
                        {meta.label}
                        {ev.event_time ? ` · ${ev.event_time}` : ''}
                        {ev.location ? ` · ${ev.location}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })
            )}

            <button
              id="full-calendar-btn"
              onClick={() => setShowCalendar(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#abadaf]/10 bg-white text-sm font-bold text-[#595c5e] transition-colors hover:text-[#006094]"
            >
              <CalendarDays size={15} />
              Full Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && userId && (
        <CalendarModal
          onClose={() => setShowCalendar(false)}
          userId={userId}
          events={events}
          onEventsChange={setEvents}
        />
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
