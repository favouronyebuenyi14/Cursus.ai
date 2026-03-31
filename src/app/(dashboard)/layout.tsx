'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Mic, FileText,
  Target, PenTool, Camera, Settings,
  LogOut, Sparkles, Menu, X, ChevronDown,
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

      setIsLoading(false)
    }

    load()
  }, [router, supabase])

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-slate-50 p-4 dark:bg-slate-900 md:flex">
        <div className="mb-8 px-2">
          <h1 className="text-2xl font-bold tracking-tighter text-blue-900 dark:text-blue-100">Cursus</h1>
          <p className="text-xs font-medium tracking-tight text-slate-500 uppercase">Academic Workspace</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-transform duration-150 ${
                  active
                    ? 'bg-white text-blue-900 shadow-sm dark:bg-slate-800 dark:text-blue-100'
                    : 'text-slate-500 hover:bg-slate-200/50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-blue-300'
                }`}
              >
                <item.icon size={18} />
                <span className="font-sans tracking-tight">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="mt-4 px-2">
          <button
            onClick={() => setCoursesOpen(!coursesOpen)}
            className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800/50 dark:text-slate-200"
          >
            <span className="text-sm font-semibold tracking-tight">Select Course</span>
            <ChevronDown size={18} />
          </button>
          {coursesOpen && (
            <div className="mt-2 space-y-1">
              <button
                onClick={() => setSelectedCourse(null)}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                  !selectedCourse
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300'
                }`}
              >
                All courses
              </button>
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c.id)}
                  className={`w-full truncate rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                    selectedCourse === c.id
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300'
                  }`}
                >
                  {c.course_code} — {c.course_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{profile?.full_name || 'Student'}</p>
              <p className="text-xs text-slate-500">{profile?.is_pro ? 'Pro Plan' : 'Free Plan'}</p>
            </div>
          </div>
          {profile?.is_pro && (
            <div className="mb-2 px-2">
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white ring-2 ring-white">PRO</span>
            </div>
          )}
          <div className="space-y-1">
            <Link href="/settings" className="flex items-center gap-3 rounded-lg px-4 py-2 text-slate-500 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300">
              <Sparkles size={20} />
              <span className="text-sm font-medium">Pro Plan</span>
            </Link>
            <Link href="/settings" className="flex items-center gap-3 rounded-lg px-4 py-2 text-slate-500 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300">
              <Settings size={20} />
              <span className="text-sm font-medium">Settings</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-slate-500 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-0 w-72 max-w-[85vw] border-r border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="absolute right-4 top-4">
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex h-full flex-col pt-12">
              <div className="mb-8 px-2">
                <h1 className="text-2xl font-bold tracking-tighter text-blue-900 dark:text-blue-100">Cursus</h1>
                <p className="text-xs font-medium tracking-tight text-slate-500 uppercase">Academic Workspace</p>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-2">
                {NAV.map(item => {
                  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-transform duration-150 ${
                        active
                          ? 'bg-white text-blue-900 shadow-sm dark:bg-slate-800 dark:text-blue-100'
                          : 'text-slate-500 hover:bg-slate-200/50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-blue-300'
                      }`}
                    >
                      <item.icon size={18} />
                      <span className="font-sans tracking-tight">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-4 px-2">
                <button
                  onClick={() => setCoursesOpen(!coursesOpen)}
                  className="flex h-11 w-full items-center justify-between rounded-xl bg-slate-100 px-4 text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <span className="text-sm font-semibold tracking-tight">Select Course</span>
                  <ChevronDown size={18} />
                </button>
                {coursesOpen && (
                  <div className="mt-2 space-y-1">
                    <button
                      onClick={() => setSelectedCourse(null)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        !selectedCourse
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300'
                      }`}
                    >
                      All courses
                    </button>
                    {courses.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCourse(c.id)}
                        className={`w-full truncate rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                          selectedCourse === c.id
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300'
                        }`}
                      >
                        {c.course_code} — {c.course_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-200 px-2 pt-4 dark:border-slate-800">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                    {profile?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{profile?.full_name || 'Student'}</p>
                    <p className="text-xs text-slate-500">{profile?.is_pro ? 'Pro Plan' : 'Free Plan'}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Link href="/settings" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-lg px-4 py-2 text-slate-500 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300">
                    <Settings size={20} />
                    <span className="text-sm font-medium">Settings</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-slate-500 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300"
                  >
                    <LogOut size={20} />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col bg-[#f5f7f9] md:ml-64">
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <main className="flex-1 overflow-y-auto px-4 py-5 pt-20 sm:px-5 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
