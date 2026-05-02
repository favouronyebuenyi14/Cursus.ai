'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookCopy, Loader2, Sparkles, AlertCircle, RotateCcw, Check, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

type Flashcard = {
  question: string
  answer: string
}

export default function FlashcardsPage() {
  const router = useRouter()
  
  const [topic, setTopic] = useState('')
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Flashcard playing state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [score, setScore] = useState({ known: 0, review: 0 })
  const [isComplete, setIsComplete] = useState(false)

  const handleGenerate = async () => {
    if (!topic.trim()) return

    setLoading(true)
    setError('')
    setCards([])
    setIsComplete(false)
    setCurrentIndex(0)
    setIsFlipped(false)
    setScore({ known: 0, review: 0 })

    try {
      const res = await fetch('/api/ai/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate flashcards')
      }

      if (data.cards && data.cards.length > 0) {
        setCards(data.cards)
      } else {
        throw new Error('No flashcards generated')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = (known: boolean) => {
    if (known) setScore(s => ({ ...s, known: s.known + 1 }))
    else setScore(s => ({ ...s, review: s.review + 1 }))

    if (currentIndex < cards.length - 1) {
      setIsFlipped(false)
      setCurrentIndex(c => c + 1)
    } else {
      setIsComplete(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => router.push('/exam-prep')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-[#595c5e]"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookCopy size={18} className="text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-[#2c2f31]">Smart Flashcards</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {cards.length === 0 ? (
          /* Setup State */
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-bold text-[#2c2f31] mb-2">What do you want to study?</h2>
            <p className="text-[#595c5e] text-sm mb-6">
              Enter a topic, chapter, or paste a chunk of text. The AI will extract the most important definitions and concepts into a flashcard deck.
            </p>

            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="E.g. Cell Biology, Mitochondria, Mitosis vs Meiosis..."
              className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-2 focus:ring-[#006094] focus:border-transparent transition-all text-[#2c2f31] text-lg mb-6 custom-scrollbar"
            />

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="px-8 py-3 bg-[#006094] text-white font-bold rounded-xl shadow-lg shadow-[#006094]/20 hover:-translate-y-0.5 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                Generate Flashcards
              </button>
            </div>
          </div>
        ) : isComplete ? (
          /* Completion State */
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-[#2c2f31] mb-2">Deck Completed!</h2>
            <p className="text-[#595c5e] mb-8">You went through all {cards.length} cards.</p>
            
            <div className="flex justify-center gap-8 mb-10">
              <div className="text-center">
                <div className="text-4xl font-black text-emerald-500 mb-1">{score.known}</div>
                <div className="text-sm font-bold text-[#595c5e] uppercase">Got It</div>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div className="text-center">
                <div className="text-4xl font-black text-rose-500 mb-1">{score.review}</div>
                <div className="text-sm font-bold text-[#595c5e] uppercase">Review</div>
              </div>
            </div>

            <button
              onClick={() => setCards([])}
              className="px-8 py-3 bg-[#006094] text-white font-bold rounded-xl hover:-translate-y-0.5 transition-transform"
            >
              Study a New Topic
            </button>
          </div>
        ) : (
          /* Playing State */
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm font-bold text-[#595c5e]">Card {currentIndex + 1} of {cards.length}</div>
              <div className="flex gap-1">
                {cards.map((_, i) => (
                  <div key={i} className={`h-1.5 w-8 rounded-full ${i <= currentIndex ? 'bg-[#006094]' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>

            {/* Flashcard */}
            <div 
              className="relative h-[400px] w-full perspective-1000 cursor-pointer group"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <AnimatePresence initial={false} mode="wait">
                {!isFlipped ? (
                  <motion.div
                    key="front"
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -180, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 bg-white rounded-3xl p-10 border-2 border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center text-center backface-hidden"
                  >
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Question</div>
                    <h3 className="text-2xl md:text-3xl font-bold text-[#2c2f31] leading-snug">
                      {cards[currentIndex].question}
                    </h3>
                    <div className="absolute bottom-6 text-slate-400 text-sm flex items-center gap-2 group-hover:text-[#006094] transition-colors">
                      <RotateCcw size={16} /> Click to flip
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -180, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 bg-blue-50 rounded-3xl p-10 border-2 border-blue-200 shadow-xl shadow-blue-200/50 flex flex-col items-center justify-center text-center backface-hidden"
                  >
                    <div className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-6">Answer</div>
                    <div className="text-xl md:text-2xl text-[#2c2f31] leading-relaxed">
                      {cards[currentIndex].answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            {isFlipped && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 mt-8"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(false); }}
                  className="flex-1 py-4 bg-white border-2 border-rose-200 text-rose-600 font-bold rounded-2xl shadow-sm hover:bg-rose-50 transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <X size={24} /> Needs Review
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(true); }}
                  className="flex-1 py-4 bg-emerald-500 border-2 border-emerald-500 text-white font-bold rounded-2xl shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <Check size={24} /> Got It!
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
