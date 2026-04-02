'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  GraduationCap,
  Loader2,
  LogOut,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course, Profile, StudentLevel } from '@/types'

type EditableCourse = {
  id?: string
  course_code: string
  course_name: string
  semester: string
}

const LEVELS: StudentLevel[] = ['100L', '200L', '300L', '400L', '500L', '600L', '700L']
const DETACH_TABLES = ['notes', 'recordings', 'documents', 'exam_preps', 'essays', 'snap_queries']

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<EditableCourse[]>([])
  const [removedCourseIds, setRemovedCourseIds] = useState<string[]>([])
  const [stats, setStats] = useState({ notes: 0, recordings: 0 })
  const [message, setMessage] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [faculty, setFaculty] = useState('')
  const [department, setDepartment] = useState('')
  const [level, setLevel] = useState<StudentLevel | ''>('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }

      setUserId(user.id)

      const [profileRes, coursesRes, notesRes, recordingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('courses').select('*').eq('user_id', user.id).order('course_code', { ascending: true }),
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('recordings').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      if (profileRes.data) {
        const loadedProfile = profileRes.data as Profile
        setProfile(loadedProfile)
        setFullName(loadedProfile.full_name || '')
        setUniversity(loadedProfile.university || '')
        setFaculty(loadedProfile.faculty || '')
        setDepartment(loadedProfile.department || '')
        setLevel((loadedProfile.level as StudentLevel | null) || '')
      }

      if (coursesRes.data) {
        setCourses((coursesRes.data as Course[]).map(course => ({
          id: course.id,
          course_code: course.course_code,
          course_name: course.course_name,
          semester: course.semester || 'current',
        })))
      }

      setStats({
        notes: notesRes.count || 0,
        recordings: recordingsRes.count || 0,
      })

      setLoading(false)
    }

    load()
  }, [router, supabase])

  function updateCourse(index: number, field: keyof EditableCourse, value: string) {
    setCourses(current => current.map((course, currentIndex) => (
      currentIndex === index ? { ...course, [field]: value } : course
    )))
  }

  function addCourse() {
    setCourses(current => [...current, { course_code: '', course_name: '', semester: 'current' }])
  }

  function removeCourse(index: number) {
    setCourses(current => {
      const course = current[index]
      if (course?.id) {
        setRemovedCourseIds(ids => [...ids, course.id!])
      }
      return current.filter((_, currentIndex) => currentIndex !== index)
    })
  }

  async function handleSave() {
    if (!userId) return

    setSaving(true)
    setMessage(null)

    try {
      const payload = {
        user_id: userId,
        full_name: fullName.trim(),
        role: profile?.role || 'university_student',
        university: university.trim() || null,
        faculty: faculty.trim() || null,
        department: department.trim() || null,
        level: level || null,
      }

      const { error: profileError } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' })
      if (profileError) throw profileError

      const existingCourses = courses
        .filter(course => course.id && course.course_code.trim() && course.course_name.trim())
        .map(course => ({
          id: course.id,
          user_id: userId,
          course_code: course.course_code.trim().toUpperCase(),
          course_name: course.course_name.trim(),
          semester: course.semester || 'current',
        }))

      const newCourses = courses
        .filter(course => !course.id && course.course_code.trim() && course.course_name.trim())
        .map(course => ({
          user_id: userId,
          course_code: course.course_code.trim().toUpperCase(),
          course_name: course.course_name.trim(),
          semester: course.semester || 'current',
        }))

      if (existingCourses.length > 0) {
        const { error } = await supabase.from('courses').upsert(existingCourses, { onConflict: 'id' })
        if (error) throw error
      }

      if (newCourses.length > 0) {
        const { error } = await supabase.from('courses').insert(newCourses)
        if (error) throw error
      }

      if (removedCourseIds.length > 0) {
        for (const courseId of removedCourseIds) {
          await Promise.all(
            DETACH_TABLES.map(table =>
              supabase.from(table).update({ course_id: null }).eq('user_id', userId).eq('course_id', courseId),
            ),
          )
        }

        const { error } = await supabase.from('courses').delete().in('id', removedCourseIds).eq('user_id', userId)
        if (error) throw error
      }

      setRemovedCourseIds([])
      setMessage('Profile updated successfully.')

      const { data: refreshedCourses } = await supabase.from('courses').select('*').eq('user_id', userId).order('course_code', { ascending: true })
      if (refreshedCourses) {
        setCourses((refreshedCourses as Course[]).map(course => ({
          id: course.id,
          course_code: course.course_code,
          course_name: course.course_name,
          semester: course.semester || 'current',
        })))
      }
    } catch (error) {
      console.error(error)
      setMessage('Unable to save your changes right now.')
    }

    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-center py-24 text-[#595c5e]">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading profile...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-[#2c2f31]">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#595c5e]">Account</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Your Profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#595c5e] md:text-base">
            Update your personal details, academic profile, and active courses. Changes here power the Notes course hub and the rest of your workspace.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#006094] px-5 text-sm font-bold text-white shadow-lg shadow-[#006094]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 md:h-12"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[#abadaf]/20 bg-white px-4 py-3 text-sm font-medium text-[#2c2f31] shadow-sm">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-6 rounded-[28px] border border-[#abadaf]/10 bg-white p-5 shadow-sm md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#006094]/10 text-[#006094]">
              <UserRound size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Profile Basics</h2>
              <p className="text-sm text-[#595c5e]">Keep your name and school details current.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full name">
              <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputClassName} placeholder="Your full name" />
            </Field>
            <Field label="University">
              <input value={university} onChange={e => setUniversity(e.target.value)} className={inputClassName} placeholder="University name" />
            </Field>
            <Field label="Faculty">
              <input value={faculty} onChange={e => setFaculty(e.target.value)} className={inputClassName} placeholder="Faculty" />
            </Field>
            <Field label="Department">
              <input value={department} onChange={e => setDepartment(e.target.value)} className={inputClassName} placeholder="Department" />
            </Field>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-[#2c2f31]">Current level</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
              {LEVELS.map(option => (
                <button
                  key={option}
                  onClick={() => setLevel(option)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                    level === option
                      ? 'border-[#006094] bg-[#006094] text-white'
                      : 'border-slate-200 bg-white text-[#595c5e] hover:border-[#006094]/40 hover:text-[#006094]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-[28px] border border-[#abadaf]/10 bg-white p-5 shadow-sm md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#91f78e]/30 text-[#006b1b]">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Account Overview</h2>
              <p className="text-sm text-[#595c5e]">Plan and workspace details at a glance.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Plan" value={profile?.is_pro ? 'Pro' : 'Free'} />
            <SummaryCard label="Courses" value={String(courses.length)} />
            <SummaryCard label="Notes" value={String(stats.notes)} />
            <SummaryCard label="Recordings" value={String(stats.recordings)} />
          </div>

          <div className="rounded-2xl bg-[#f5f7f9] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#595c5e]">Account details</p>
            <div className="mt-3 space-y-2 text-sm text-[#2c2f31]">
              <p><span className="font-semibold">Status:</span> {profile?.is_pro ? 'Pro Plan' : 'Free Plan'}</p>
              <p><span className="font-semibold">Access:</span> {profile?.role === 'teacher' ? 'Teacher workspace' : 'Student workspace'}</p>
              <p><span className="font-semibold">Pro expiry:</span> {profile?.pro_expires_at || 'Not currently on Pro'}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#595c5e] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </section>
      </div>

      <section className="space-y-6 rounded-[28px] border border-[#abadaf]/10 bg-white p-5 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4eadf4]/15 text-[#006094]">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Course Management</h2>
              <p className="text-sm text-[#595c5e]">Add, rename, or remove courses that feed into your Notes workspace.</p>
            </div>
          </div>

          <button
            onClick={addCourse}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#eef1f3] px-4 text-sm font-semibold text-[#2c2f31] transition-colors hover:bg-slate-200"
          >
            <Plus size={16} />
            Add course
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-[#abadaf]/30 bg-[#f8fafc] px-4 py-3 text-xs text-[#595c5e]">
          Removing a course detaches existing notes, recordings, documents, exam prep, essays, and snap history from that course so your older content remains available.
        </div>

        <div className="space-y-3">
          {courses.map((course, index) => (
            <div key={course.id || `new-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-[#abadaf]/10 bg-[#fcfdff] p-4 md:grid-cols-[160px_minmax(0,1fr)_130px_48px]">
              <input
                value={course.course_code}
                onChange={e => updateCourse(index, 'course_code', e.target.value.toUpperCase())}
                className={inputClassName}
                placeholder="CSC 301"
              />
              <input
                value={course.course_name}
                onChange={e => updateCourse(index, 'course_name', e.target.value)}
                className={inputClassName}
                placeholder="Course title"
              />
              <input
                value={course.semester}
                onChange={e => updateCourse(index, 'semester', e.target.value)}
                className={inputClassName}
                placeholder="current"
              />
              <button
                onClick={() => removeCourse(index)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-[#595c5e] transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {courses.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef1f3] text-[#595c5e]">
                <BookOpen size={28} />
              </div>
              <div>
                <h4 className="font-bold text-[#2c2f31]">No courses yet</h4>
                <p className="mt-1 text-sm text-[#595c5e]">Add at least one course to feed your Notes course hub.</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string, children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#2c2f31]">{label}</span>
      {children}
    </label>
  )
}

function SummaryCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="rounded-2xl border border-[#abadaf]/10 bg-[#fcfdff] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#595c5e]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#2c2f31]">{value}</p>
    </div>
  )
}

const inputClassName = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#2c2f31] placeholder:text-slate-400 focus:border-[#4eadf4] focus:outline-none focus:ring-2 focus:ring-[#4eadf4]/30'
