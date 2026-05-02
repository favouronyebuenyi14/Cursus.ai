'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  FileText, Upload, Plus, Trash2, Search, Library as LibraryIcon, AlertCircle, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Document, Profile, Course } from '@/types'
import { useDropzone } from 'react-dropzone'

const FREE_TIER_DAYS = 135 // ~4.5 months

export default function LibraryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profRes, docsRes, coursesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('courses').select('*').eq('user_id', user.id)
      ])

      if (profRes.data) setProfile(profRes.data as Profile)
      if (coursesRes.data) {
        const loadedCourses = coursesRes.data as Course[]
        setCourses(loadedCourses)
        if (loadedCourses.length > 0) {
          setSelectedCourseId(loadedCourses[0].id)
        }
      }
      
      if (docsRes.data) {
        let loadedDocs = docsRes.data as Document[]
        // Apply 4.5 month filter for free users
        if (profRes.data && !profRes.data.is_pro) {
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - FREE_TIER_DAYS)
          loadedDocs = loadedDocs.filter(doc => new Date(doc.created_at) >= cutoff)
        }
        setDocuments(loadedDocs)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    if (!selectedCourseId && courses.length > 0) {
      alert('Please select a course first to upload this document to.')
      return
    }

    const courseId = selectedCourseId || (courses.length > 0 ? courses[0].id : null)

    setUploading(true)
    const file = acceptedFiles[0]
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { contentType: 'application/pdf', upsert: true })

      if (uploadError) throw uploadError

      // Bucket is public — get the permanent public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const { data: newDoc, error: dbError } = await supabase.from('documents').insert({
        user_id: user.id,
        course_id: courseId,
        title: file.name.replace('.pdf', ''),
        file_url: publicUrl,
        file_type: 'pdf',
      }).select().single()

      if (dbError) throw dbError
      if (newDoc) {
        setDocuments(prev => [newDoc as Document, ...prev])
        setShowUploadModal(false)
        // No redirect! The user stays on the dashboard to continue organizing or reading.
      }
    } catch (err) {
      console.error(err)
      alert('Failed to upload document. Ensure the "documents" bucket exists in Supabase.')
    } finally {
      setUploading(false)
    }
  }, [supabase, router, selectedCourseId, courses])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  })

  async function deleteDoc(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this document?')) return
    await supabase.from('documents').delete().eq('id', id)
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  const lowerSearch = search.trim().toLowerCase()
  const visibleDocs = documents.filter(doc => 
    doc.course_id === selectedCourseId &&
    (!lowerSearch || doc.title.toLowerCase().includes(lowerSearch))
  )

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <div className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2c2f31] md:text-4xl flex items-center gap-3">
              <LibraryIcon className="text-[#006094]" size={36} />
              Library & PDF Chat
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#595c5e] md:text-base">
              Upload your lecture slides, course outlines, and textbooks. Ask questions and get AI-powered explanations directly from your documents.
            </p>
          </div>
          
          <button 
            onClick={() => setShowUploadModal(true)}
            className="shrink-0 h-11 px-5 bg-[#006094] text-white font-bold rounded-xl flex items-center gap-2 transition-transform hover:-translate-y-0.5 shadow-lg shadow-[#006094]/20"
          >
            <Upload size={18} />
            Upload PDF
          </button>
        </div>

        {courses.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => setSelectedCourseId(course.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  selectedCourseId === course.id ? 'bg-[#006094] text-white' : 'bg-slate-100 text-[#595c5e] hover:bg-slate-200'
                }`}
              >
                {course.course_code}
              </button>
            ))}
          </div>
        )}

        {/* Removed dropzone from main view */}

        {!profile?.is_pro && (
          <div className="mb-8 flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-amber-800 border border-amber-200">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">
              Free plan: Documents are automatically cleared after {Math.floor(FREE_TIER_DAYS / 30)} months. Upgrade to Pro for permanent storage.
            </p>
          </div>
        )}

        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#595c5e]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your library..."
            className="h-11 w-full rounded-full border-none bg-[#eef1f3] pl-10 pr-4 text-sm transition-all focus:ring-2 focus:ring-[#4eadf4] md:h-12"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : visibleDocs.length === 0 ? (
          <div className="py-12 text-center text-[#595c5e]">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold text-[#2c2f31]">No documents found</p>
            <p className="mt-1 text-sm">Upload a PDF to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDocs.map((doc, i) => {
              const docCourse = courses.find(c => c.id === doc.course_id)
              return (
                <motion.article
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => router.push(`/library/${doc.id}`)}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:shadow-xl hover:-translate-y-1"
                >
                  <div>
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                          <FileText size={20} />
                        </div>
                        {docCourse && (
                          <span className="rounded-md bg-[#006094]/10 px-2 py-1 text-xs font-bold text-[#006094]">
                            {docCourse.course_code}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => deleteDoc(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h3 className="line-clamp-2 text-lg font-bold text-[#2c2f31]">{doc.title}</h3>
                  </div>
                  <div className="mt-4 text-xs font-medium text-[#595c5e]">
                    Added {formatRelativeTime(doc.created_at)}
                  </div>
                </motion.article>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl md:p-8" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-extrabold text-[#2c2f31]">Upload a Document</h2>
            <p className="mb-6 text-sm text-[#595c5e]">Upload a PDF to chat with it. It will be added to your library.</p>
            
            <div
              {...getRootProps()}
              className={`mb-6 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
                isDragActive ? 'border-[#006094] bg-[#006094]/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center text-[#006094]">
                  <Loader2 className="mb-3 animate-spin" size={32} />
                  <p className="font-bold">Uploading document...</p>
                  <p className="text-xs mt-2 text-[#595c5e]">This might take a few seconds...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-[#595c5e]">
                  <div className="h-14 w-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                    <Upload size={24} className="text-[#006094]" />
                  </div>
                  <p className="font-bold text-[#2c2f31]">
                    {isDragActive ? 'Drop PDF here' : 'Drag & drop or browse'}
                  </p>
                  <p className="mt-1 text-xs">Only .pdf files are supported</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="px-5 py-2.5 rounded-xl font-bold text-[#595c5e] hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
