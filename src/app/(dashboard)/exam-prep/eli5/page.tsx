'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BrainCircuit, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ELI5Page() {
  const router = useRouter()
  const supabase = createClient()
  
  const [input, setInput] = useState('')
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExplain = async () => {
    if (!input.trim()) return

    setLoading(true)
    setError('')
    setExplanation('')

    try {
      const res = await fetch('/api/ai/eli5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: input })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to generate explanation')
      }

      // Read streaming response
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      
      let generated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.text) {
                generated += parsed.text
                setExplanation(generated)
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
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
            <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <BrainCircuit size={18} className="text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-[#2c2f31]">Explain It Simply</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 mb-8">
          <h2 className="text-lg font-bold text-[#2c2f31] mb-2">What's confusing you?</h2>
          <p className="text-[#595c5e] text-sm mb-6">
            Paste any complex paragraph, definition, or concept from your textbook. The AI will break it down using simple, relatable analogies.
          </p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="E.g. Newton's second law of thermodynamics..."
            className="w-full h-40 p-5 bg-slate-50 border border-slate-200 rounded-2xl resize-none focus:ring-2 focus:ring-[#006094] focus:border-transparent transition-all text-[#2c2f31] text-lg mb-6 custom-scrollbar"
          />

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleExplain}
              disabled={loading || !input.trim()}
              className="px-8 py-3 bg-[#006094] text-white font-bold rounded-xl shadow-lg shadow-[#006094]/20 hover:-translate-y-0.5 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Explain to me like I'm 5
            </button>
          </div>
        </div>

        {/* Result Area */}
        {(explanation || loading) && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 min-h-[200px] animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-sm font-bold text-[#595c5e] uppercase tracking-wider mb-6 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" /> 
              Simplified Explanation
            </h3>
            
            <div className="prose prose-lg max-w-none text-[#2c2f31] whitespace-pre-wrap leading-relaxed">
              {explanation ? (
                explanation
              ) : (
                <div className="flex items-center gap-3 text-[#595c5e]">
                  <Loader2 size={20} className="animate-spin text-[#006094]" />
                  Thinking of a good analogy...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
