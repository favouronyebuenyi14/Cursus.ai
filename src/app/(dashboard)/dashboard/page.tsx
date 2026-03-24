'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BookOpen, Mic, FileText, Target, PenTool, Camera, ArrowRight, Calendar, Sparkles, Bell, User, MoreHorizontal, LayoutDashboard, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Profile, Note, Recording, Document } from '@/types'

const QUICK_ACTIONS = [
  { href: '/notes', icon: BookOpen, label: 'New Note', color: 'text-teal-400', bg: 'bg-teal-400/10' },
  { href: '/recorder', icon: Mic, label: 'Record Lecture', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { href: '/library', icon: FileText, label: 'Upload PDF', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { href: '/snap', icon: Camera, label: 'Snap & Ask', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { href: '/exam-prep', icon: Target, label: 'Exam Prep', color: 'text-red-400', bg: 'bg-red-400/10' },
  { href: '/research', icon: PenTool, label: 'Research', color: 'text-green-400', bg: 'bg-green-400/10' },
]

export default function DashboardHome() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ notes: 0, recordings: 0, documents: 0 })
  const [recentNotes, setRecentNotes] = useState<Note[]>([])
  const [recentRecordings, setRecentRecordings] = useState<Recording[]>([])
  const todayDate = new Date().toLocaleDateString('en-NG', { weekday: undefined, year: 'numeric', month: 'long', day: 'numeric' })

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

      const noteCount = notesRes.data?.length || 0
      const recCount = recsRes.data?.length || 0
      const docCount = (docsRes.data as any)?.[0]?.count || 0
      setStats({ notes: noteCount, recordings: recCount, documents: docCount })
    }
    load()
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Good {getGreeting()}, {firstName} 👋
            </h1>
            <p className="text-white/50 text-sm">
              {profile?.department && profile?.level
                ? `${profile.department} · ${profile.level} · ${profile.university}`
                : 'Welcome to your academic workspace.'}
            </p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 shadow-sm rounded-xl px-4 py-2 flex items-center gap-3 border border-slate-200 dark:border-slate-700/10">
            <Calendar size={18} className="text-primary" />
            <span className="text-sm font-semibold">{todayDate}</span>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-4">
        {[
          { label: 'Notes', value: stats.notes, icon: BookOpen, href: '/notes' },
          { label: 'Recordings', value: stats.recordings, icon: Mic, href: '/recorder' },
          { label: 'Documents', value: stats.documents, icon: FileText, href: '/library' },
        ].map(s => (
          <Link key={s.label} href={s.href} className="glass-card p-4 hover:bg-white/[0.05] transition-colors">
            <s.icon size={18} className="text-teal-400 mb-3" />
            <div className="text-2xl font-bold mb-0.5">{s.value}</div>
            <div className="text-white/40 text-xs">{s.label}</div>
          </Link>
        ))}
      </motion.div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map(a => (
            <button key={a.href} onClick={() => router.push(a.href)}
              className="glass-card p-4 flex flex-col items-center gap-2 text-center hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group">
              <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <a.icon size={20} className={a.color} />
              </div>
              <span className="text-xs font-medium text-white/70">{a.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent notes */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Recent notes</h2>
            <Link href="/notes" className="text-xs text-teal-400 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentNotes.length === 0 ? (
            <EmptyState icon={BookOpen} label="No notes yet" href="/notes" action="Write your first note" />
          ) : (
            <div className="space-y-2">
              {recentNotes.map(note => (
                <Link key={note.id} href={`/notes/${note.id}`}
                  className="glass-card p-3.5 flex items-center gap-3 hover:bg-white/[0.05] transition-colors">
                  <BookOpen size={16} className="text-teal-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{note.title || 'Untitled note'}</p>
                    <p className="text-xs text-white/30">{formatRelativeTime(note.updated_at)}</p>
                  </div>
                  {note.ai_expanded_content && (
                    <span className="text-xs bg-teal-400/10 text-teal-400 px-1.5 py-0.5 rounded shrink-0">AI</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent recordings */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Recent recordings</h2>
            <Link href="/recorder" className="text-xs text-teal-400 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentRecordings.length === 0 ? (
            <EmptyState icon={Mic} label="No recordings yet" href="/recorder" action="Record a lecture" />
          ) : (
            <div className="space-y-2">
              {recentRecordings.map(rec => (
                <Link key={rec.id} href={`/recorder`}
                  className="glass-card p-3.5 flex items-center gap-3 hover:bg-white/[0.05] transition-colors">
                  <Mic size={16} className="text-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rec.title || 'Untitled recording'}</p>
                    <p className="text-xs text-white/30">{formatRelativeTime(rec.created_at)}</p>
                  </div>
                  {rec.ai_notes && (
                    <span className="text-xs bg-purple-400/10 text-purple-400 px-1.5 py-0.5 rounded shrink-0">Notes</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Placeholder secondary panels (UI-only) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-primary to-primary/60 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-md mb-4">
              <span className="w-2 h-2 bg-tertiary-container rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Active Countdown</span>
            </div>
            <h4 className="text-xl font-black mb-1 leading-tight">BIO 301 Final Exam</h4>
            <p className="text-white/80 text-sm mb-4">Molecular Biology Advanced Level</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tighter">12</span>
              <span className="text-lg font-bold opacity-80">days left</span>
            </div>
            <button className="w-full mt-6 py-2 bg-white text-primary font-bold rounded-xl shadow-lg hover:bg-on-primary transition-colors">Start Study Prep</button>
          </div>
          <span className="absolute -top-10 -right-10 text-[130px] opacity-10">?</span>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-xl space-y-4 border border-slate-200 dark:border-slate-700/10">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Upcoming Classes</h4>
            <MoreHorizontal size={18} className="text-slate-400" />
          </div>
          <div className="flex gap-4 p-3 bg-white rounded-lg border border-slate-200 dark:border-slate-700/10">
            <div className="text-center min-w-[3rem]">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Oct</p>
              <p className="text-xl font-black text-primary">25</p>
            </div>
            <div className="border-l border-slate-200 dark:border-slate-700/10 pl-4">
              <p className="text-sm font-bold">PHY 202 Seminar</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">09:30 AM • Hall B</p>
            </div>
          </div>
          <div className="flex gap-4 p-3 bg-white rounded-lg border border-slate-200 dark:border-slate-700/10">
            <div className="text-center min-w-[3rem]">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Oct</p>
              <p className="text-xl font-black text-primary">27</p>
            </div>
            <div className="border-l border-slate-200 dark:border-slate-700/10 pl-4">
              <p className="text-sm font-bold">Research Peer Review</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">02:00 PM • Remote</p>
            </div>
          </div>
          <button className="w-full py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Full Calendar</button>
        </div>

        <div className="bg-white/40 border border-white p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Study Buddy AI</p>
              <p className="text-[10px] text-primary font-bold uppercase">Online</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">"I've synthesized your last 3 lecture recordings. Want to generate a practice quiz for PHY 202?"</p>
          <button className="text-sm font-bold text-primary flex items-center gap-1 group">Generate Quiz <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></button>
        </div>
      </div>

    </div>
  )
}

function EmptyState({ icon: Icon, label, href, action }: { icon: any, label: string, href: string, action: string }) {
  return (
    <div className="glass-card p-6 flex flex-col items-center text-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
        <Icon size={20} className="text-white/20" />
      </div>
      <p className="text-sm text-white/30">{label}</p>
      <Link href={href} className="text-xs text-teal-400 hover:underline flex items-center gap-1">
        {action} <ArrowRight size={12} />
      </Link>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
