'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Mic, FileText,
  Target, PenTool, Camera, Settings, ChevronRight,
  LogOut, Sparkles, Menu, X, ChevronDown,
  Search, Bell, Plus, Edit
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Course } from '@/types'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/notes', icon: BookOpen, label: 'Smart Notes' },
  { href: '/recorder', icon: Mic, label: 'Recorder' },
  { href: '/library', icon: FileText, label: 'Library' },
  { href: '/exam-prep', icon: Target, label: 'Exam Prep' },
  { href: '/research', icon: PenTool, label: 'Research' },
  { href: '/snap', icon: Camera, label: 'Snap & Ask' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [coursesOpen, setCoursesOpen] = useState(false)

  useEffect(() => {
  async function load() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/auth/login')
      return
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (prof) setProfile(prof as Profile)

    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)

    if (courseData) setCourses(courseData as Course[])

    // ✅ VERY IMPORTANT
    setIsLoading(false)
  }

  load()
}, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (isLoading) {
  return <div className="p-8">Initializing...</div>
}

if (!profile) {
  return <div className="p-8 text-red-500">Failed to load profile</div>
}

  const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/notes': 'Smart Notes',
    '/recorder': 'Recorder',
    '/library': 'Library',
    '/exam-prep': 'Exam Prep',
    '/research': 'Research',
    '/snap': 'Snap & Ask',
    '/settings': 'Settings',
  }
  const pageTitle = pageTitles[pathname] || 'Dashboard'

  // Wait for auth check and profile data to load before rendering protected content
  if (isLoading || !profile) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <aside className="fixed h-screen w-64 left-0 top-0 bg-slate-50 dark:bg-slate-900 flex flex-col p-4 z-50">
        <div className="mb-8 px-2">
          <h1 className="text-2xl font-bold tracking-tighter text-blue-900 dark:text-blue-100">Cursus</h1>
          <p className="text-xs font-medium tracking-tight text-slate-500 uppercase">Academic Workspace</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-transform duration-150 ${
                  active
                    ? 'text-blue-900 dark:text-blue-100 bg-white dark:bg-slate-800 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/80'
                }`}>
                <item.icon size={18} />
                <span className="font-sans tracking-tight">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="mt-4 px-2">
          <button onClick={() => setCoursesOpen(!coursesOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors">
            <span className="text-sm font-semibold tracking-tight">Select Course</span>
            <ChevronDown size={18} />
          </button>
          {coursesOpen && (
            <div className="mt-2 space-y-1">
              <button onClick={() => setSelectedCourse(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${!selectedCourse ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300'}`}>
                All courses
              </button>
              {courses.map(c => (
                <button key={c.id} onClick={() => setSelectedCourse(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors truncate ${selectedCourse === c.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300'}`}>
                  {c.course_code} — {c.course_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-sm font-bold">
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{profile?.full_name || 'Student'}</p>
              <p className="text-xs text-slate-500">{profile?.is_pro ? 'Pro Plan' : 'Free Plan'}</p>
            </div>
          </div>
          {profile?.is_pro && (
            <div className="px-2 mb-2">
              <span className="text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full ring-2 ring-white">PRO</span>
            </div>
          )}
          <div className="space-y-1">
            <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg transition-colors">
              <Sparkles size={20} />
              <span className="text-sm font-medium">Pro Plan</span>
            </Link>
            <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg transition-colors">
              <Settings size={20} />
              <span className="text-sm font-medium">Settings</span>
            </Link>
            <button onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg transition-colors text-left">
              <LogOut size={20} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="absolute top-4 right-4">
              <button onClick={() => setSidebarOpen(false)} className="text-slate-500 dark:text-slate-300">
                <X size={20} />
              </button>
            </div>
            <div className="h-full pt-12">
              <div className="mb-8 px-2">
                <h1 className="text-2xl font-bold tracking-tighter text-blue-900 dark:text-blue-100">Cursus</h1>
                <p className="text-xs font-medium tracking-tight text-slate-500 uppercase">Academic Workspace</p>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-2">
                {NAV.map(item => {
                  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link key={item.href} href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-transform duration-150 ${
                        active
                          ? 'text-blue-900 dark:text-blue-100 bg-white dark:bg-slate-800 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/80'
                      }`}>
                      <item.icon size={18} />
                      <span className="font-sans tracking-tight">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </aside>
        </div>
      )}

      <div className="ml-64 flex-1 flex flex-col bg-slate-50 dark:bg-slate-950">
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center justify-between px-8 h-full">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold tracking-tight text-blue-900 dark:text-blue-100">{pageTitle}</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="pl-10 pr-4 py-2 w-64 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Search notes, exams..." type="text" />
              </div>
              <button className="relative p-2 text-slate-500 hover:text-blue-600 transition-colors">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>
              <button onClick={() => router.push('/notes')} className="flex items-center justify-center p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all">
                <Plus size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="mt-16 p-8 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <button onClick={() => router.push('/notes')} className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50">
        <Edit size={20} />
      </button>
    </div>
  )
}