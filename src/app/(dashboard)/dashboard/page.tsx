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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Profile, Note, Recording } from '@/types'

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
      const { data: { user } } = await supabase.auth.getUser()
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
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-[#f5f7f9] min-h-screen text-[#2c2f31]">

      {/* Welcome Message & Date */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Good {getGreeting()}, {firstName} 👋
          </h2>

          <p className="text-[#595c5e] font-medium mt-1">
            {profile?.department && profile?.level
              ? `${profile.department} · ${profile.level} · ${profile.university}`
              : 'Ready to tackle your academic goals today?'}
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-xl px-4 py-2 flex items-center gap-3 border border-[#abadaf]/10">
          <Calendar size={18} className="text-[#006094]" />
          <span className="text-sm font-semibold">{todayDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left/Center Column */}
        <div className="lg:col-span-8 space-y-8">

          {/* Quick Actions */}
          <section>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#006094] rounded-full" />
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.href}
                  onClick={() => router.push(a.href)}
                  className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all group border border-[#abadaf]/10"
                >
                  <div
                    className={`w-12 h-12 rounded-full ${a.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                  >
                    <a.icon size={22} className={a.color} />
                  </div>
                  <span className="text-sm font-bold text-[#2c2f31]">{a.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Academic Progress */}
          <section>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#4b5c78] rounded-full" />
              Academic Progress
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Notes */}
              <div className="bg-[#006094] text-[#ebf3ff] p-6 rounded-xl shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
                    Notes Written
                  </p>
                  <p className="text-4xl font-black">{stats.notes}</p>

                  <div className="mt-4 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${Math.min(stats.notes * 10, 100)}%` }}
                    />
                  </div>

                  <p className="text-[10px] mt-2 font-medium opacity-80">
                    Keep writing!
                  </p>
                </div>

                <BookOpen
                  className="absolute -bottom-4 -right-4 text-white/10 group-hover:rotate-12 transition-transform"
                  size={96}
                />
              </div>

              {/* Recordings */}
              <div className="bg-[#4b5c78] text-[#eef2ff] p-6 rounded-xl shadow-sm relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
                    Recordings Made
                  </p>
                  <p className="text-4xl font-black">{stats.recordings}</p>

                  <div className="mt-4 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${Math.min(stats.recordings * 10, 100)}%` }}
                    />
                  </div>

                  <p className="text-[10px] mt-2 font-medium opacity-80">
                    Record your lectures
                  </p>
                </div>

                <Mic
                  className="absolute -bottom-4 -right-4 text-white/10 group-hover:rotate-12 transition-transform"
                  size={96}
                />
              </div>

              {/* PDFs */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-[#abadaf]/10 relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#595c5e] mb-1">
                    PDFs Analyzed
                  </p>
                  <p className="text-4xl font-black text-[#006094]">{stats.documents}</p>

                  <div className="mt-4 h-1 w-full bg-[#4eadf4]/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#006094] rounded-full"
                      style={{ width: `${Math.min(stats.documents * 10, 100)}%` }}
                    />
                  </div>

                  <p className="text-[10px] mt-2 font-medium text-[#595c5e]">
                    Upload your first PDF
                  </p>
                </div>

                <FileText
                  className="absolute -bottom-4 -right-4 text-[#006094]/5 group-hover:rotate-12 transition-transform"
                  size={96}
                />
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#006b1b] rounded-full" />
                Recent Activity
              </h3>

              <Link href="/notes" className="text-sm font-bold text-[#006094] hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {recentNotes.length === 0 && recentRecordings.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#abadaf]/10 p-8 text-center">
                  <BookOpen size={32} className="text-[#abadaf] mx-auto mb-3" />
                  <p className="text-sm font-bold text-[#2c2f31] mb-1">
                    No activity yet
                  </p>
                  <p className="text-xs text-[#595c5e] mb-4">
                    Start by creating a note or recording a lecture
                  </p>
                  <button
                    onClick={() => router.push('/notes')}
                    className="px-4 py-2 bg-[#006094] text-white text-sm font-bold rounded-lg hover:bg-[#005482] transition-colors"
                  >
                    Create New Note
                  </button>
                </div>
              ) : (
                <>
                  {recentNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => router.push(`/notes/${note.id}`)}
                      className="group flex items-center justify-between p-4 bg-white rounded-xl border border-[#abadaf]/5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#4eadf4]/10 flex items-center justify-center">
                          <BookOpen size={18} className="text-[#006094]" />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-[#2c2f31]">
                            {note.title || 'Untitled note'}
                          </p>
                          <p className="text-xs text-[#595c5e]">
                            {formatRelativeTime(note.updated_at)}
                          </p>
                        </div>
                      </div>

                      <ArrowRight
                        size={18}
                        className="text-[#abadaf] group-hover:text-[#006094] transition-colors"
                      />
                    </div>
                  ))}

                  {recentRecordings.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => router.push('/recorder')}
                      className="group flex items-center justify-between p-4 bg-white rounded-xl border border-[#abadaf]/5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#c1d2f3]/20 flex items-center justify-center">
                          <Mic size={18} className="text-[#4b5c78]" />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-[#2c2f31]">
                            {rec.title || 'Untitled recording'}
                          </p>
                          <p className="text-xs text-[#595c5e]">
                            {formatRelativeTime(rec.created_at)}
                          </p>
                        </div>
                      </div>

                      <ArrowRight
                        size={18}
                        className="text-[#abadaf] group-hover:text-[#4b5c78] transition-colors"
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">

          {/* Exam Countdown */}
          <div className="bg-gradient-to-br from-[#006094] to-[#005482] text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-md mb-6">
                <span className="w-2 h-2 bg-[#91f78e] rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Active Countdown
                </span>
              </div>

              <h4 className="text-xl font-black mb-1 leading-tight">
                BIO 301 Final Exam
              </h4>

              <p className="text-white/80 text-sm mb-6">
                Molecular Biology Advanced Level
              </p>

              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tighter">12</span>
                <span className="text-xl font-bold opacity-70">days left</span>
              </div>

              <button className="w-full mt-8 py-3 bg-white text-[#006094] font-bold rounded-xl shadow-lg hover:bg-slate-50 transition-colors">
                Start Study Prep
              </button>
            </div>

            <Target className="absolute -top-10 -right-10 text-white/10" size={180} />
          </div>

          {/* Upcoming Classes */}
          <div className="bg-[#eef1f3] p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#2c2f31] uppercase tracking-wider">
                Upcoming Classes
              </h4>
              <MoreHorizontal size={18} className="text-[#595c5e]" />
            </div>

            {[
              { month: 'Oct', day: '25', title: 'PHY 202 Seminar', time: '09:30 AM • Hall B' },
              { month: 'Oct', day: '27', title: 'Research Peer Review', time: '02:00 PM • Remote' },
            ].map((item) => (
              <div
                key={item.day}
                className="flex gap-4 p-3 bg-white rounded-lg border border-[#abadaf]/5"
              >
                <div className="text-center min-w-[3rem]">
                  <p className="text-xs font-bold text-[#595c5e] uppercase">{item.month}</p>
                  <p className="text-xl font-black text-[#006094]">{item.day}</p>
                </div>

                <div className="border-l border-[#abadaf]/10 pl-4">
                  <p className="text-sm font-bold text-[#2c2f31]">{item.title}</p>
                  <p className="text-xs text-[#595c5e]">{item.time}</p>
                </div>
              </div>
            ))}

            <button className="w-full py-2 text-sm font-bold text-[#595c5e] bg-white rounded-lg hover:bg-slate-50 transition-colors border border-[#abadaf]/10">
              Full Calendar
            </button>
          </div>

          {/* Study Buddy AI */}
          <div className="bg-white/40 border border-white p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>

              <div>
                <p className="text-sm font-bold text-[#2c2f31]">Study Buddy AI</p>
                <p className="text-[10px] text-[#006094] font-bold uppercase">Online</p>
              </div>
            </div>

            <p className="text-sm text-[#595c5e] leading-relaxed mb-4">
              &ldquo;I&apos;ve synthesized your last 3 lecture recordings. Want to generate a practice quiz for PHY 202?&rdquo;
            </p>

            <button className="text-sm font-bold text-[#006094] flex items-center gap-1 group">
              Generate Quiz
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
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