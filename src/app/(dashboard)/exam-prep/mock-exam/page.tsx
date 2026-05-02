'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Target, Loader2, Sparkles, AlertCircle, CheckCircle2, XCircle, ChevronRight, Timer, FileText, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

type Question = {
  id: string
  question: string
  options?: string[] // For MCQ
  correctAnswer: string
  explanation: string
}

type UserAnswer = {
  questionId: string
  answer: string
}

export default function MockExamPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [topic, setTopic] = useState('')
  const [examType, setExamType] = useState<'mcq' | 'theory'>('mcq')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Exam state
  const [questions, setQuestions] = useState<Question[]>([])
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [grades, setGrades] = useState<{ [id: string]: { correct: boolean, feedback: string } }>({})

  const handleGenerate = async () => {
    if (!topic.trim()) return

    setLoading(true)
    setError('')
    setQuestions([])
    setUserAnswers([])
    setIsSubmitted(false)

    try {
      const res = await fetch('/api/ai/mock-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, type: examType })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate exam')

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
      } else {
        throw new Error('No questions generated')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (qId: string, answer: string) => {
    setUserAnswers(prev => {
      const existing = prev.find(a => a.questionId === qId)
      if (existing) {
        return prev.map(a => a.questionId === qId ? { ...a, answer } : a)
      }
      return [...prev, { questionId: qId, answer }]
    })
  }

  const handleSubmit = async () => {
    setIsGrading(true)
    setIsSubmitted(true)
    
    // Auto-grading for MCQs logic can be local, but Theory needs AI.
    // Let's do it on the server for consistency.
    try {
      const res = await fetch('/api/ai/mock-exam/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, userAnswers, type: examType })
      })
      const data = await res.json()
      if (data.grades) setGrades(data.grades)
    } catch (err) {
      console.error("Grading failed", err)
    } finally {
      setIsGrading(false)
    }
  }

  const score = Object.values(grades).filter(g => g.correct).length

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
            <div className="h-8 w-8 bg-rose-100 rounded-lg flex items-center justify-center">
              <Target size={18} className="text-rose-600" />
            </div>
            <h1 className="text-xl font-bold text-[#2c2f31]">Mock Exam Simulator</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {questions.length === 0 ? (
          /* Setup State */
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-bold text-[#2c2f31] mb-2">Configure your exam</h2>
            <p className="text-[#595c5e] text-sm mb-8">
              Tell the AI what topics you want to be tested on. You can choose between Multiple Choice or Theory questions.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-[#2c2f31] mb-2 uppercase tracking-wider">Exam Topic</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="E.g. Computer Science 101, Data Structures and Algorithms, Organic Chemistry..."
                  className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-2 focus:ring-[#006094] focus:border-transparent transition-all text-[#2c2f31] text-lg custom-scrollbar"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#2c2f31] mb-2 uppercase tracking-wider">Question Format</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setExamType('mcq')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${examType === 'mcq' ? 'border-[#006094] bg-[#006094]/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                  >
                    <CheckCircle2 size={24} className={examType === 'mcq' ? 'text-[#006094]' : 'text-slate-300'} />
                    <span className="font-bold">Multiple Choice</span>
                  </button>
                  <button 
                    onClick={() => setExamType('theory')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${examType === 'theory' ? 'border-[#006094] bg-[#006094]/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                  >
                    <FileText size={24} className={examType === 'theory' ? 'text-[#006094]' : 'text-slate-300'} />
                    <span className="font-bold">Theory / Essay</span>
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="mt-10 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="px-10 py-4 bg-[#006094] text-white font-bold rounded-2xl shadow-xl shadow-[#006094]/20 hover:-translate-y-0.5 transition-transform flex items-center gap-3 disabled:opacity-50 disabled:hover:translate-y-0 text-lg"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                Generate My Exam
              </button>
            </div>
          </div>
        ) : (
          /* Exam Taking State */
          <div className="space-y-8">
            <div className="bg-[#006094] rounded-3xl p-6 text-white flex items-center justify-between shadow-lg shadow-[#006094]/20">
              <div>
                <h2 className="text-xl font-bold">Mock Exam: {topic.slice(0, 30)}...</h2>
                <p className="text-blue-100 text-sm mt-1">{questions.length} Questions • {examType.toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20">
                <Timer size={18} />
                <span className="font-mono font-bold">TIMED TEST</span>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, i) => (
                <div key={q.id} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
                  <div className="flex items-start gap-4 mb-6">
                    <span className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500 shrink-0">
                      {i + 1}
                    </span>
                    <h3 className="text-xl font-bold text-[#2c2f31]">{q.question}</h3>
                  </div>

                  {examType === 'mcq' ? (
                    <div className="grid grid-cols-1 gap-3 pl-12">
                      {q.options?.map((option, optIndex) => (
                        <button
                          key={optIndex}
                          disabled={isSubmitted}
                          onClick={() => handleAnswerChange(q.id, option)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                            userAnswers.find(a => a.questionId === q.id)?.answer === option
                              ? 'border-[#006094] bg-[#006094]/5'
                              : 'border-slate-50 hover:border-slate-100 bg-slate-50'
                          } ${
                            isSubmitted && grades[q.id] 
                              ? (option === q.correctAnswer ? 'border-emerald-500 bg-emerald-50' : (userAnswers.find(a => a.questionId === q.id)?.answer === option ? 'border-rose-500 bg-rose-50' : ''))
                              : ''
                          }`}
                        >
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            userAnswers.find(a => a.questionId === q.id)?.answer === option ? 'border-[#006094]' : 'border-slate-300'
                          }`}>
                            {userAnswers.find(a => a.questionId === q.id)?.answer === option && <div className="h-2.5 w-2.5 rounded-full bg-[#006094]" />}
                          </div>
                          <span className="font-medium text-[#2c2f31]">{option}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="pl-12">
                      <textarea
                        disabled={isSubmitted}
                        value={userAnswers.find(a => a.questionId === q.id)?.answer || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Write your answer here..."
                        className="w-full h-40 p-5 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-2 focus:ring-[#006094] focus:border-transparent transition-all text-[#2c2f31]"
                      />
                    </div>
                  )}

                  {isSubmitted && grades[q.id] && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`mt-6 ml-12 p-5 rounded-2xl ${grades[q.id].correct ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {grades[q.id].correct ? <CheckCircle2 className="text-emerald-600" size={18}/> : <XCircle className="text-rose-600" size={18}/>}
                        <span className={`font-bold ${grades[q.id].correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {grades[q.id].correct ? 'Correct' : 'Needs Work'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {grades[q.id].feedback}
                      </p>
                      {!grades[q.id].correct && q.correctAnswer && (
                        <div className="mt-3 pt-3 border-t border-slate-200/50">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Correct Answer</span>
                          <p className="text-sm font-bold text-[#2c2f31]">{q.correctAnswer}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            {!isSubmitted ? (
              <div className="flex justify-center pt-10">
                <button
                  onClick={handleSubmit}
                  disabled={userAnswers.length < questions.length}
                  className="px-12 py-4 bg-[#006094] text-white font-bold rounded-2xl shadow-xl shadow-[#006094]/20 hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-50 disabled:hover:translate-y-0 text-xl"
                >
                  <Send size={20} /> Submit My Exam
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 pt-10">
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center w-full max-w-sm">
                  <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-2">Your Result</h3>
                  <div className="text-6xl font-black text-[#006094] mb-4">
                    {isGrading ? <Loader2 className="animate-spin inline-block h-12 w-12" /> : `${score}/${questions.length}`}
                  </div>
                  <p className="text-[#595c5e]">
                    {score === questions.length ? 'Outstanding! Perfect score.' : score >= (questions.length / 2) ? 'Good job! You passed.' : 'Keep studying, you can do this!'}
                  </p>
                </div>
                <button
                  onClick={() => { setQuestions([]); setIsSubmitted(false); setGrades({}); }}
                  className="px-8 py-3 text-[#006094] font-bold hover:bg-[#006094]/5 rounded-xl transition-colors"
                >
                  Try Another Topic
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
