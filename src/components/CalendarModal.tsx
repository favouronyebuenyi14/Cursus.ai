'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Target,
  AlertCircle,
  Trash2,
  Tag,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type CalendarEvent = {
  id: string
  user_id: string
  title: string
  event_date: string   // ISO date string e.g. "2026-05-15"
  event_time?: string  // e.g. "09:30 AM"
  location?: string
  event_type: 'exam' | 'class' | 'deadline' | 'other'
  created_at: string
}

type AddForm = {
  title: string
  event_time: string
  location: string
  event_type: CalendarEvent['event_type']
}

const EVENT_TYPES: { value: CalendarEvent['event_type']; label: string; color: string; bg: string; icon: typeof Target }[] = [
  { value: 'exam', label: 'Exam', color: 'text-red-600', bg: 'bg-red-100', icon: Target },
  { value: 'class', label: 'Class', color: 'text-[#006094]', bg: 'bg-[#4eadf4]/20', icon: BookOpen },
  { value: 'deadline', label: 'Deadline', color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertCircle },
  { value: 'other', label: 'Other', color: 'text-[#4b5c78]', bg: 'bg-[#c1d2f3]/30', icon: Tag },
]

const DOT_COLORS: Record<CalendarEvent['event_type'], string> = {
  exam: 'bg-red-500',
  class: 'bg-[#006094]',
  deadline: 'bg-orange-500',
  other: 'bg-[#4b5c78]',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDisplayDate(isoDateStr: string) {
  const [y, m, d] = isoDateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

interface CalendarModalProps {
  onClose: () => void
  userId: string
  events: CalendarEvent[]
  onEventsChange: (events: CalendarEvent[]) => void
}

export default function CalendarModal({ onClose, userId, events, onEventsChange }: CalendarModalProps) {
  const supabase = createClient()
  const overlayRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [addingEvent, setAddingEvent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState<AddForm>({
    title: '',
    event_time: '',
    location: '',
    event_type: 'class',
  })

  // Group events by date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      const d = ev.event_date.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(ev)
    }
    return map
  }, [events])

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : []

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  async function handleAddEvent() {
    if (!form.title.trim() || !selectedDate) return
    setSaving(true)
    const { data, error } = await supabase.from('events').insert({
      user_id: userId,
      title: form.title.trim(),
      event_date: selectedDate,
      event_time: form.event_time || null,
      location: form.location || null,
      event_type: form.event_type,
    }).select().single()

    if (!error && data) {
      onEventsChange([...events, data as CalendarEvent])
      setForm({ title: '', event_time: '', location: '', event_type: 'class' })
      setAddingEvent(false)
    }
    setSaving(false)
  }

  async function handleDeleteEvent(id: string) {
    setDeletingId(id)
    await supabase.from('events').delete().eq('id', id).eq('user_id', userId)
    onEventsChange(events.filter(ev => ev.id !== id))
    setDeletingId(null)
  }

  // Navigate years
  function prevYear() { setViewYear(y => y - 1) }
  function nextYear() { setViewYear(y => y + 1) }

  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#abadaf]/10 bg-[#f5f7f9] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#006094]/10">
              <Calendar size={18} className="text-[#006094]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2c2f31]">Full Calendar</h2>
              <p className="text-xs text-[#595c5e]">Click any day to add or view events</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Year navigation */}
            <div className="flex items-center gap-2 rounded-xl border border-[#abadaf]/20 bg-white px-3 py-1.5">
              <button onClick={prevYear} className="text-[#595c5e] hover:text-[#2c2f31]">
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[3rem] text-center text-sm font-bold text-[#2c2f31]">{viewYear}</span>
              <button onClick={nextYear} className="text-[#595c5e] hover:text-[#2c2f31]">
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#595c5e] transition-colors hover:bg-slate-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-2.5 border-b border-[#abadaf]/10 bg-white">
          {EVENT_TYPES.map(t => (
            <div key={t.value} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${DOT_COLORS[t.value]}`} />
              <span className="text-[11px] font-semibold text-[#595c5e]">{t.label}</span>
            </div>
          ))}
        </div>

        {/* 12-month grid */}
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 md:grid-cols-4 max-h-[60vh] overflow-y-auto">
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const daysInMonth = getDaysInMonth(viewYear, monthIndex)
            const firstDay = getFirstDayOfMonth(viewYear, monthIndex)

            return (
              <div key={monthIndex} className="rounded-xl border border-[#abadaf]/10 bg-[#f5f7f9] p-3">
                <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-[#2c2f31]">
                  {MONTHS[monthIndex].slice(0, 3)}
                </p>

                {/* Day headers */}
                <div className="mb-1 grid grid-cols-7 gap-px">
                  {DAYS_SHORT.map(d => (
                    <div key={d} className="text-center text-[9px] font-bold text-[#abadaf]">{d}</div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-px">
                  {/* Empty cells for offset */}
                  {Array.from({ length: firstDay }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1
                    const dateStr = isoDate(viewYear, monthIndex, day)
                    const dayEvents = eventsByDate[dateStr] || []
                    const isToday = dateStr === todayIso
                    const isSelected = dateStr === selectedDate
                    const isPast = dateStr < todayIso

                    return (
                      <button
                        key={day}
                        onClick={() => { setSelectedDate(dateStr); setAddingEvent(false) }}
                        className={`relative flex flex-col items-center justify-start rounded-md p-0.5 transition-all hover:bg-white hover:shadow-sm ${
                          isSelected
                            ? 'bg-[#006094] shadow-sm'
                            : isToday
                            ? 'bg-[#4eadf4]/20'
                            : ''
                        }`}
                      >
                        <span className={`text-[10px] font-semibold leading-tight ${
                          isSelected ? 'text-white' : isToday ? 'text-[#006094] font-black' : isPast ? 'text-[#abadaf]' : 'text-[#2c2f31]'
                        }`}>
                          {day}
                        </span>

                        {/* Event dots */}
                        {dayEvents.length > 0 && (
                          <div className="mt-0.5 flex items-center gap-px">
                            {dayEvents.slice(0, 3).map(ev => (
                              <span
                                key={ev.id}
                                className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : DOT_COLORS[ev.event_type]}`}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected day panel */}
        {selectedDate && (
          <div className="border-t border-[#abadaf]/10 bg-white px-6 py-5 rounded-b-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-[#2c2f31]">{formatDisplayDate(selectedDate)}</p>
                    <p className="text-xs text-[#595c5e]">{selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => { setAddingEvent(true) }}
                    className="flex items-center gap-1.5 rounded-xl bg-[#006094] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#005482]"
                  >
                    <Plus size={13} />
                    Add Event
                  </button>
                </div>

                {/* Existing events for this day */}
                {selectedEvents.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {selectedEvents.map(ev => {
                      const meta = EVENT_TYPES.find(t => t.value === ev.event_type) || EVENT_TYPES[3]
                      const Icon = meta.icon
                      return (
                        <div key={ev.id} className="flex items-center gap-3 rounded-xl border border-[#abadaf]/10 bg-[#f5f7f9] px-3 py-2.5">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                            <Icon size={14} className={meta.color} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-[#2c2f31]">{ev.title}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {ev.event_time && (
                                <span className="flex items-center gap-1 text-[10px] text-[#595c5e]">
                                  <Clock size={10} /> {ev.event_time}
                                </span>
                              )}
                              {ev.location && (
                                <span className="flex items-center gap-1 text-[10px] text-[#595c5e]">
                                  <MapPin size={10} /> {ev.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            disabled={deletingId === ev.id}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#abadaf] transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add event form */}
                {addingEvent && (
                  <div className="rounded-xl border border-[#006094]/20 bg-[#4eadf4]/5 p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#006094]">New Event</p>

                    <input
                      autoFocus
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Event title (e.g. PHY 301 Exam)"
                      className="w-full rounded-lg border border-[#abadaf]/20 bg-white px-3 py-2 text-sm font-medium text-[#2c2f31] placeholder:text-[#abadaf] focus:border-[#006094] focus:outline-none"
                      onKeyDown={e => { if (e.key === 'Enter') handleAddEvent() }}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={form.event_time}
                        onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))}
                        placeholder="Time (e.g. 09:30 AM)"
                        className="rounded-lg border border-[#abadaf]/20 bg-white px-3 py-2 text-sm text-[#2c2f31] placeholder:text-[#abadaf] focus:border-[#006094] focus:outline-none"
                      />
                      <input
                        value={form.location}
                        onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="Location (optional)"
                        className="rounded-lg border border-[#abadaf]/20 bg-white px-3 py-2 text-sm text-[#2c2f31] placeholder:text-[#abadaf] focus:border-[#006094] focus:outline-none"
                      />
                    </div>

                    {/* Event type selector */}
                    <div className="flex flex-wrap gap-2">
                      {EVENT_TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setForm(f => ({ ...f, event_type: t.value }))}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                            form.event_type === t.value
                              ? `${t.bg} ${t.color} ring-2 ring-offset-1 ring-current`
                              : 'bg-white text-[#595c5e] hover:bg-slate-50'
                          }`}
                        >
                          <t.icon size={12} />
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddEvent}
                        disabled={!form.title.trim() || saving}
                        className="flex h-9 flex-1 items-center justify-center rounded-lg bg-[#006094] text-sm font-bold text-white transition-colors hover:bg-[#005482] disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save Event'}
                      </button>
                      <button
                        onClick={() => setAddingEvent(false)}
                        className="flex h-9 items-center justify-center rounded-lg border border-[#abadaf]/20 bg-white px-4 text-sm font-bold text-[#595c5e] hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!addingEvent && selectedEvents.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#abadaf]/20 py-6 text-center">
                    <Calendar size={24} className="mb-2 text-[#abadaf]" />
                    <p className="text-xs font-bold text-[#595c5e]">No events on this day</p>
                    <p className="text-xs text-[#abadaf]">Click &ldquo;Add Event&rdquo; to create one</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
