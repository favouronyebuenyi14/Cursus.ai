'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Megaphone, BookOpen, Zap, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type Notification = {
  id: string
  title: string
  body: string
  category: 'update' | 'education' | 'system'
  created_at: string
}

const CATEGORY_META = {
  update: { label: 'Product Update', icon: Megaphone, color: 'text-[#006094]', bg: 'bg-[#4eadf4]/15' },
  education: { label: 'Study Tip', icon: BookOpen, color: 'text-[#006b1b]', bg: 'bg-[#91f78e]/20' },
  system: { label: 'System', icon: Zap, color: 'text-[#4b5c78]', bg: 'bg-[#c1d2f3]/30' },
}

const LS_KEY = (userId: string) => `cursus_read_notifs_${userId}`

function getReadIds(userId: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY(userId)) || '[]')
  } catch {
    return []
  }
}

function markRead(userId: string, ids: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_KEY(userId), JSON.stringify(ids))
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export default function NotificationBell({ userId }: { userId: string }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ids = getReadIds(userId)
    setReadIds(ids)

    supabase
      .from('notifications')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[])
      })
  }, [userId, supabase])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length

  function handleOpen() {
    setOpen(o => !o)
    if (!open && unreadCount > 0) {
      const allIds = notifications.map(n => n.id)
      markRead(userId, allIds)
      setReadIds(allIds)
    }
  }

  function handleMarkAllRead() {
    const allIds = notifications.map(n => n.id)
    markRead(userId, allIds)
    setReadIds(allIds)
  }

  return (
    <div ref={ref} className="relative">
      <button
        id="notification-bell"
        onClick={handleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[340px] sm:w-[380px] overflow-hidden rounded-2xl border border-[#abadaf]/20 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#abadaf]/10 bg-[#f5f7f9] px-4 py-3">
            <div>
              <p className="text-sm font-bold text-[#2c2f31]">Notifications</p>
              {unreadCount > 0 && (
                <p className="text-xs text-[#595c5e]">{unreadCount} unread</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {readIds.length < notifications.length && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#006094] hover:bg-[#4eadf4]/10"
                >
                  <Check size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#595c5e] hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell size={32} className="mb-3 text-[#abadaf]" />
                <p className="text-sm font-bold text-[#2c2f31]">All caught up!</p>
                <p className="text-xs text-[#595c5e]">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notif => {
                const isUnread = !readIds.includes(notif.id)
                const meta = CATEGORY_META[notif.category] || CATEGORY_META.system
                const Icon = meta.icon
                return (
                  <div
                    key={notif.id}
                    className={`flex gap-3 border-b border-[#abadaf]/8 px-4 py-3.5 transition-colors last:border-0 ${
                      isUnread ? 'bg-[#4eadf4]/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
                      <Icon size={15} className={meta.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold leading-snug ${isUnread ? 'text-[#2c2f31]' : 'text-[#595c5e]'}`}>
                          {notif.title}
                        </p>
                        {isUnread && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#006094]" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#595c5e]">{notif.body}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-[#abadaf]">{timeAgo(notif.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-[#abadaf]/10 bg-[#f5f7f9] px-4 py-2.5 text-center">
              <p className="text-[11px] text-[#abadaf]">
                Updates from Cursus are shown here
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
