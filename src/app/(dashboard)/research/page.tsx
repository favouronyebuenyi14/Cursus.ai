'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileEdit, Plus, Search, FileText, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Profile } from '@/types'

export type ResearchDocument = {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export default function ResearchDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [documents, setDocuments] = useState<ResearchDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profRes, docsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('research_documents').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
      ])

      if (profRes.data) setProfile(profRes.data as Profile)
      if (docsRes.data) setDocuments(docsRes.data as ResearchDocument[])
      
      setLoading(false)
    }
    load()
  }, [supabase])

  async function createDraft() {
    if (!profile?.is_pro && documents.length >= 3) {
      alert("Free plan is limited to 3 research drafts. Upgrade to Pro for unlimited.")
      return
    }

    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('research_documents')
      .insert({ user_id: user.id, title: 'Untitled Research' })
      .select()
      .single()

    if (error) {
      console.error(error)
      alert("Failed to create draft")
      setCreating(false)
    } else if (data) {
      router.push(`/research/${data.id}`)
    }
  }

  const visibleDocs = documents.filter(doc => 
    !search.trim() || doc.title.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-8 md:py-8">
        <div className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2c2f31] md:text-4xl flex items-center gap-3">
              <FileEdit className="text-[#006094]" size={36} />
              AI Co-Writer
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#595c5e] md:text-base">
              Write faster with AI autocomplete. Pull context directly from your library.
            </p>
          </div>
          
          <button 
            onClick={createDraft}
            disabled={creating}
            className="shrink-0 h-11 px-5 bg-[#006094] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 shadow-lg shadow-[#006094]/20 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            New Document
          </button>
        </div>

        <div className="relative mb-8">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#595c5e]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your drafts..."
            className="h-11 w-full rounded-full border-none bg-[#eef1f3] pl-10 pr-4 text-sm transition-all focus:ring-2 focus:ring-[#4eadf4] md:h-12"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="py-20 text-center text-[#595c5e] flex flex-col items-center">
            <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-[#006094]">
              <Sparkles size={32} />
            </div>
            <p className="font-bold text-lg text-[#2c2f31]">Nothing written yet</p>
            <p className="mt-2 text-sm max-w-xs">Start a new document and let the AI help you write your next masterpiece.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDocs.map((doc, i) => (
              <motion.article
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => router.push(`/research/${doc.id}`)}
                className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef1f3] text-[#595c5e]">
                      <FileText size={20} />
                    </div>
                  </div>
                  <h3 className="line-clamp-2 text-lg font-bold text-[#2c2f31]">{doc.title}</h3>
                </div>
                <div className="mt-4 text-xs font-medium text-[#595c5e]">
                  Last edited {formatRelativeTime(doc.updated_at)}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
