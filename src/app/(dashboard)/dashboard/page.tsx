'use client'

import { useEffect, useState } from 'react'
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
  Sparkles,
  MoreHorizontal,
  Bell,
  Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Note, Profile, Recording } from '@/types'

const QUICK_ACTIONS = [
  { href: '/notes', icon: BookOpen, label: 'New Note', color: 'text-[#006094]', bg: 'bg-[#4eadf4]/20' },
  { href: '/recorder', icon: Mic, label: 'New Recording', color: 'text-[#4b5c78]', bg: 'bg-[#c1d2f3]/30' },
  { href: '/library', icon: FileText, label: 'Upload PDF', color: 'text-[#006b1b]', bg: 'bg-[#91f78e]/30' },
  { href: '/snap', icon: Camera, label: 'Snap a Question', color: 'text-[#006094]', bg: 'bg-[#006094]/10' },
]

export default function DashboardHome() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ notes: 0, recordings: 0, documents: 0 })
  const [recentNotes, setRecentNotes] = useState<Note[]>([])
  const [recentRecordings, setRecentRecordings] = useState<Recording[]>([])

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

      const [profRes, notesRes, recsRes, docsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(4),
        supabase.from('recordings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('documents').select('count').eq('user_id', user.id),
      ])

      if (profRes.data) setProfile(profRes.data as Profile)
      if (notesRes.data) setRecentNotes(notesRes.data as Note[])
      if (recsRes.data) setRecentRecordings(recsRes.data as Recording[])

      setStats({
        notes: notesRes.data?.length || 0,
        recordings: recsRes.data?.length || 0,
        documents: (docsRes.data as any)?.[0]?.count || 0,
      })
    }

    load()
  }, [supabase])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#2c2f31] md:space-y-8">
      <div className="flex items-center justify-end gap-2 sm:gap-3">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
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
                  key={action.href}
                  onClick={() => router.push(action.href)}
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
                      onClick={() => router.push('/recorder')}
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
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#006094] to-[#005482] p-6 text-white shadow-xl md:p-8">
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-md">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#91f78e]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Active Countdown</span>
              </div>

              <h4 className="mb-1 text-xl font-black leading-tight">BIO 301 Final Exam</h4>
              <p className="mb-6 text-sm text-white/80">Molecular Biology Advanced Level</p>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tighter sm:text-6xl">12</span>
                <span className="text-xl font-bold opacity-70">days left</span>
              </div>

              <button className="mt-8 h-11 w-full rounded-xl bg-white font-bold text-[#006094] shadow-lg transition-colors hover:bg-slate-50 md:h-12">
                Start Study Prep
              </button>
            </div>

            <Target className="absolute -right-10 -top-10 text-white/10" size={180} />
          </div>

          <div className="space-y-4 rounded-xl bg-[#eef1f3] p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#2c2f31]">Upcoming Classes</h4>
              <MoreHorizontal size={18} className="text-[#595c5e]" />
            </div>

            {[
              { month: 'Oct', day: '25', title: 'PHY 202 Seminar', time: '09:30 AM · Hall B' },
              { month: 'Oct', day: '27', title: 'Research Peer Review', time: '02:00 PM · Remote' },
            ].map(item => (
              <div key={item.day} className="flex gap-3 rounded-lg border border-[#abadaf]/5 bg-white p-3 sm:gap-4">
                <div className="min-w-[3rem] text-center">
                  <p className="text-xs font-bold uppercase text-[#595c5e]">{item.month}</p>
                  <p className="text-xl font-black text-[#006094]">{item.day}</p>
                </div>

                <div className="border-l border-[#abadaf]/10 pl-4">
                  <p className="text-sm font-bold text-[#2c2f31]">{item.title}</p>
                  <p className="text-xs text-[#595c5e]">{item.time}</p>
                </div>
              </div>
            ))}

            <button className="h-10 w-full rounded-lg border border-[#abadaf]/10 bg-white text-sm font-bold text-[#595c5e] transition-colors hover:bg-slate-50">
              Full Calendar
            </button>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white bg-white/40 p-5 backdrop-blur-sm md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500">
                <Sparkles size={20} className="text-white" />
              </div>

              <div>
                <p className="text-sm font-bold text-[#2c2f31]">Study Buddy AI</p>
                <p className="text-[10px] font-bold uppercase text-[#006094]">Online</p>
              </div>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-[#595c5e]">
              &ldquo;I&apos;ve synthesized your last 3 lecture recordings. Want to generate a practice quiz for PHY 202?&rdquo;
            </p>

            <button className="flex items-center gap-1 text-sm font-bold text-[#006094] group">
              Generate Quiz
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
