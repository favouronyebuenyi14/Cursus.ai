'use client'

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  ChevronRight,
  GraduationCap,
  Loader2,
  LogOut,
  Save,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MAX_PROFILE_COURSES } from '@/lib/course-settings'
import {
  AVATAR_BUCKET,
  AVATAR_PREVIEW_SIZE,
  clampAvatarOffset,
  cropAvatarToBlob,
  getAvatarOffsetBounds,
  getAvatarUrl,
} from '@/lib/profile-media'
import type { Course, Profile, StudentLevel } from '@/types'

const LEVELS: StudentLevel[] = ['100L', '200L', '300L', '400L', '500L', '600L', '700L']
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type CropImageInfo = {
  src: string
  width: number
  height: number
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [stats, setStats] = useState({ notes: 0, recordings: 0 })
  const [message, setMessage] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [faculty, setFaculty] = useState('')
  const [department, setDepartment] = useState('')
  const [level, setLevel] = useState<StudentLevel | ''>('')

  const [cropImage, setCropImage] = useState<CropImageInfo | null>(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffsetX, setCropOffsetX] = useState(0)
  const [cropOffsetY, setCropOffsetY] = useState(0)

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
        setCourses(coursesRes.data as Course[])
      }

      setStats({
        notes: notesRes.count || 0,
        recordings: recordingsRes.count || 0,
      })

      setLoading(false)
    }

    load()
  }, [router, supabase])

  const avatarUrl = useMemo(() => {
    if (!profile?.avatar_url) return null
    return getAvatarUrl(supabase, profile.avatar_url)
  }, [profile?.avatar_url, supabase])

  const cropBounds = cropImage
    ? getAvatarOffsetBounds(cropImage.width, cropImage.height, cropZoom, AVATAR_PREVIEW_SIZE)
    : { maxX: 0, maxY: 0 }

  useEffect(() => {
    if (!cropImage) return
    setCropOffsetX(current => clampAvatarOffset(current, cropBounds.maxX))
    setCropOffsetY(current => clampAvatarOffset(current, cropBounds.maxY))
  }, [cropBounds.maxX, cropBounds.maxY, cropImage])

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (cropImage?.src.startsWith('blob:')) {
      URL.revokeObjectURL(cropImage.src)
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError('Please choose a JPG, PNG, or WEBP image.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setCropImage({
        src: objectUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
      setCropZoom(1)
      setCropOffsetX(0)
      setCropOffsetY(0)
      setAvatarError(null)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setAvatarError('That image could not be opened. Please try another file.')
    }
    image.src = objectUrl
  }

  function closeCropModal() {
    if (cropImage?.src.startsWith('blob:')) {
      URL.revokeObjectURL(cropImage.src)
    }
    setCropImage(null)
    setCropZoom(1)
    setCropOffsetX(0)
    setCropOffsetY(0)
  }

  async function handleAvatarSave() {
    if (!userId || !profile || !cropImage) return

    setUploadingAvatar(true)
    setAvatarError(null)

    try {
      const avatarBlob = await cropAvatarToBlob(cropImage.src, {
        zoom: cropZoom,
        offsetX: cropOffsetX,
        offsetY: cropOffsetY,
      })

      const avatarPath = `${userId}/avatar-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarPath, avatarBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const previousAvatar = profile.avatar_url
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarPath })
        .eq('user_id', userId)

      if (profileError) throw profileError

      if (previousAvatar && previousAvatar !== avatarPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([previousAvatar])
      }

      setProfile(current => (current ? { ...current, avatar_url: avatarPath } : current))
      setMessage('Profile photo updated successfully.')
      closeCropModal()
    } catch (error) {
      console.error(error)
      setAvatarError('Unable to save your profile photo right now.')
    }

    setUploadingAvatar(false)
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

      setProfile(current => (current
        ? {
            ...current,
            ...payload,
            full_name: payload.full_name,
          }
        : current))

      setMessage('Profile updated successfully.')
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#595c5e]">Account</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Your Profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#595c5e] md:text-base">
            Update your personal details, manage up to 25 courses, and personalize your workspace with a profile photo.
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

      {avatarError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 shadow-sm">
          {avatarError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-6 rounded-[28px] border border-[#abadaf]/10 bg-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <button
              onClick={openFilePicker}
              className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#abadaf]/15 bg-[#eef1f3] text-[#595c5e] transition-transform hover:-translate-y-0.5"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-[#243247]">
                  {fullName?.[0]?.toUpperCase() || profile?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-[#121a2b]/80 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={14} />
                Change
              </div>
            </button>

            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#006094]/10 text-[#006094]">
                  <UserRound size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Profile Basics</h2>
                  <p className="text-sm text-[#595c5e]">Tap your avatar to choose, crop, and save a profile photo.</p>
                </div>
              </div>

              <button
                onClick={openFilePicker}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#595c5e] transition-colors hover:border-[#006094]/25 hover:text-[#006094]"
              >
                <Camera size={16} />
                Add or change photo
              </button>
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

      <section className="rounded-[28px] border border-[#abadaf]/10 bg-white p-5 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4eadf4]/15 text-[#006094]">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Course Management</h2>
              <p className="text-sm text-[#595c5e]">
                Manage the courses that feed your Notes workspace. You can add up to {MAX_PROFILE_COURSES}.
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/profile/courses')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#eef1f3] px-4 text-sm font-semibold text-[#2c2f31] transition-colors hover:bg-slate-200"
          >
            Add course
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="rounded-2xl border border-dashed border-[#abadaf]/30 bg-[#f8fafc] px-4 py-4 text-sm text-[#595c5e]">
            {courses.length === 0
              ? 'You have not added any courses yet. Open the course manager to add the classes you are taking this session.'
              : `You currently have ${courses.length} of ${MAX_PROFILE_COURSES} courses saved. Changes there will reflect in Smart Notes.`}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {courses.slice(0, 3).map(course => (
              <div key={course.id} className="rounded-2xl border border-[#abadaf]/10 bg-[#fcfdff] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#006094]">{course.course_code}</p>
                <p className="mt-2 text-sm font-semibold text-[#2c2f31]">{course.course_name}</p>
              </div>
            ))}
            {courses.length > 3 ? (
              <div className="rounded-2xl border border-[#abadaf]/10 bg-[#fcfdff] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#595c5e]">More</p>
                <p className="mt-2 text-sm font-semibold text-[#2c2f31]">+{courses.length - 3} more courses</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {cropImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121a2b]/70 p-4" onClick={closeCropModal}>
          <div
            className="w-full max-w-2xl rounded-[28px] bg-white p-5 shadow-2xl md:p-8"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#595c5e]">Profile photo</p>
                <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-[#2c2f31]">Crop your avatar</h3>
                <p className="mt-2 text-sm text-[#595c5e]">Move and zoom your photo until it looks right, then save it.</p>
              </div>

              <button
                onClick={closeCropModal}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#595c5e] transition-colors hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
              <div className="mx-auto flex flex-col items-center gap-4">
                <div className="relative h-[320px] w-[320px] overflow-hidden rounded-[32px] bg-[#eef1f3] shadow-inner">
                  <div className="absolute inset-4 overflow-hidden rounded-full border-4 border-white/90 shadow-[0_0_0_999px_rgba(18,26,43,0.28)]">
                    <img
                      src={cropImage.src}
                      alt="Avatar crop preview"
                      className="absolute left-1/2 top-1/2 max-w-none select-none"
                      style={{
                        width: `${cropImage.width * (Math.max(AVATAR_PREVIEW_SIZE / cropImage.width, AVATAR_PREVIEW_SIZE / cropImage.height) * cropZoom)}px`,
                        height: `${cropImage.height * (Math.max(AVATAR_PREVIEW_SIZE / cropImage.width, AVATAR_PREVIEW_SIZE / cropImage.height) * cropZoom)}px`,
                        transform: `translate(calc(-50% + ${cropOffsetX}px), calc(-50% + ${cropOffsetY}px))`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#abadaf]/15 bg-[#eef1f3]">
                  <img
                    src={cropImage.src}
                    alt="Avatar mini preview"
                    className="max-w-none"
                    style={{
                      width: `${cropImage.width * (Math.max(80 / cropImage.width, 80 / cropImage.height) * cropZoom)}px`,
                      height: `${cropImage.height * (Math.max(80 / cropImage.width, 80 / cropImage.height) * cropZoom)}px`,
                      transform: `translate(${cropOffsetX * (80 / AVATAR_PREVIEW_SIZE)}px, ${cropOffsetY * (80 / AVATAR_PREVIEW_SIZE)}px)`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-5">
                <Slider label="Zoom" min={1} max={3} step={0.01} value={cropZoom} onChange={setCropZoom} />
                <Slider
                  label="Move left / right"
                  min={-cropBounds.maxX}
                  max={cropBounds.maxX}
                  step={1}
                  value={cropOffsetX}
                  onChange={setCropOffsetX}
                  disabled={cropBounds.maxX === 0}
                />
                <Slider
                  label="Move up / down"
                  min={-cropBounds.maxY}
                  max={cropBounds.maxY}
                  step={1}
                  value={cropOffsetY}
                  onChange={setCropOffsetY}
                  disabled={cropBounds.maxY === 0}
                />

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    onClick={openFilePicker}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#595c5e] transition-colors hover:border-[#006094]/25 hover:text-[#006094]"
                  >
                    <Camera size={16} />
                    Choose another
                  </button>

                  <button
                    onClick={handleAvatarSave}
                    disabled={uploadingAvatar}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#006094] px-5 text-sm font-bold text-white shadow-lg shadow-[#006094]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
                  >
                    {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                    {uploadingAvatar ? 'Saving photo...' : 'Save photo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#2c2f31]">{label}</span>
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#595c5e]">
          {Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled || max === min}
        onChange={event => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#dfe6ee]"
      />
    </label>
  )
}

const inputClassName = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#2c2f31] placeholder:text-slate-400 focus:border-[#4eadf4] focus:outline-none focus:ring-2 focus:ring-[#4eadf4]/30'
