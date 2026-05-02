'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DETACH_TABLES, MAX_PROFILE_COURSES } from '@/lib/course-settings'
import type { Course } from '@/types'

type EditableCourse = {
  id?: string
  course_code: string
  course_name: string
  semester: string
}

export default function ProfileCoursesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [courses, setCourses] = useState<EditableCourse[]>([])
  const [removedCourseIds, setRemovedCourseIds] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }

      setUserId(user.id)

      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .order('course_code', { ascending: true })

      if (data) {
        setCourses((data as Course[]).map(course => ({
          id: course.id,
          course_code: course.course_code,
          course_name: course.course_name,
          semester: course.semester || 'current',
        })))
      }

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
    if (courses.length >= MAX_PROFILE_COURSES) return
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
    if (courses.length > MAX_PROFILE_COURSES) {
      setMessage(`You can only save up to ${MAX_PROFILE_COURSES} courses.`)
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const existingCourses = courses
        .filter(course => course.id && course.course_code.trim() && course.course_name.trim())
        .map(course => ({
          id: course.id,
          user_id: userId,
          course_code: course.course_code.trim().toUpperCase(),
          course_name: course.course_name.trim(),
          semester: course.semester.trim() || 'current',
        }))

      const newCourses = courses
        .filter(course => !course.id && course.course_code.trim() && course.course_name.trim())
        .map(course => ({
          user_id: userId,
          course_code: course.course_code.trim().toUpperCase(),
          course_name: course.course_name.trim(),
          semester: course.semester.trim() || 'current',
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
      setMessage('Courses updated successfully.')

      const { data: refreshedCourses } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', userId)
        .order('course_code', { ascending: true })

      if (refreshedCourses) {
        setCourses((refreshedCourses as Course[]).map(course => ({
          id: course.id,
          course_code: course.course_code,
          course_name: course.course_name,
          semester: course.semester || 'current',
        })))
      }

      router.push('/notes')
      router.refresh()
    } catch (error) {
      console.error(error)
      setMessage('Unable to save your courses right now.')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-center py-24 text-[#595c5e]">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading courses...
      </div>
    )
  }

  const atLimit = courses.length >= MAX_PROFILE_COURSES

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-[#2c2f31]">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-bold text-[#595c5e] transition-colors hover:text-[#006094]">
            <ArrowLeft size={16} />
            Back to profile
          </Link>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#595c5e]">Profile workspace</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Manage your courses</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#595c5e] md:text-base">
            Add, rename, or remove the courses you are taking. Smart Notes will reflect whatever you save here.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#006094] px-5 text-sm font-bold text-white shadow-lg shadow-[#006094]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 md:h-12"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save courses'}
        </button>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[#abadaf]/20 bg-white px-4 py-3 text-sm font-medium text-[#2c2f31] shadow-sm">
          {message}
        </div>
      ) : null}

      <section className="space-y-6 rounded-[28px] border border-[#abadaf]/10 bg-white p-5 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4eadf4]/15 text-[#006094]">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Course manager</h2>
              <p className="text-sm text-[#595c5e]">
                {courses.length} / {MAX_PROFILE_COURSES} courses used.
              </p>
            </div>
          </div>

          <button
            onClick={addCourse}
            disabled={atLimit}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#eef1f3] px-4 text-sm font-semibold text-[#2c2f31] transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Add course
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-[#abadaf]/30 bg-[#f8fafc] px-4 py-3 text-xs text-[#595c5e]">
          {atLimit
            ? `You have reached the ${MAX_PROFILE_COURSES}-course limit. Remove a course before adding another one.`
            : 'Removing a course detaches existing notes, recordings, documents, exam prep, essays, and snap history from that course so your older content remains available.'}
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
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
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

const inputClassName = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#2c2f31] placeholder:text-slate-400 focus:border-[#4eadf4] focus:outline-none focus:ring-2 focus:ring-[#4eadf4]/30'
