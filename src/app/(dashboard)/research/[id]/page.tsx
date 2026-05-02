'use client'

import { useEffect, useState, useRef, KeyboardEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Crown, Loader2, Sparkles, FileText, CheckCircle2, ChevronDown, AlignLeft, List, MousePointer2, Share, ShieldCheck, Zap, MoreHorizontal, Undo, Redo, Type, Code, Superscript, Subscript, Link, Highlighter, AtSign, Image, Table, Square, Sigma } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ProModal from '@/components/ProModal'
import type { Profile } from '@/types'
import type { ResearchDocument } from '../page'

type BlockType = 'h1' | 'h2' | 'h3' | 'p'

interface Block {
  id: string
  type: BlockType
  content: string
}

export default function ResearchEditorPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [document, setDocument] = useState<ResearchDocument | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProModal, setShowProModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Editor State
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  
  // Wizard State
  const [docPrompt, setDocPrompt] = useState('')
  const [outlineType, setOutlineType] = useState<'imrad' | 'smart' | 'none'>('imrad')
  const [generatingOutline, setGeneratingOutline] = useState(false)

  // Autocomplete State
  const [ghostText, setGhostText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const blockRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [docRes, profRes] = await Promise.all([
        supabase.from('research_documents').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('profiles').select('*').eq('user_id', user.id).single()
      ])

      if (docRes.data) {
        const doc = docRes.data as ResearchDocument
        setDocument(doc)
        setTitle(doc.title === 'Untitled Research' ? '' : doc.title)
        
        try {
          if (doc.content) {
            const parsed = JSON.parse(doc.content)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setBlocks(parsed)
            } else {
              setBlocks([{ id: crypto.randomUUID(), type: 'p', content: doc.content }])
            }
          } else {
            setShowWizard(true)
          }
        } catch {
          setBlocks(doc.content ? [{ id: crypto.randomUUID(), type: 'p', content: doc.content }] : [])
          if (!doc.content) setShowWizard(true)
        }
      }
      
      if (profRes.data) setProfile(profRes.data as Profile)

      setLoading(false)
    }
    load()
  }, [id, supabase])

  // Auto-save logic
  useEffect(() => {
    if (!document || loading || showWizard) return
    
    const timeout = setTimeout(async () => {
      setSaving(true)
      await supabase.from('research_documents').update({ 
        title: title || 'Untitled Document', 
        content: JSON.stringify(blocks),
        updated_at: new Date().toISOString()
      }).eq('id', document.id)
      setSaving(false)
    }, 1500)

    return () => clearTimeout(timeout)
  }, [title, blocks, document, loading, showWizard, supabase])

  // Resize textarea automatically
  const resizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (element) {
      element.style.height = 'auto'
      element.style.height = `${element.scrollHeight}px`
    }
  }

  const updateBlock = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
    
    // Ghost text logic
    if (ghostText) setGhostText('')
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = setTimeout(async () => {
      if (content.trim().length > 10 && content.endsWith(' ')) {
        setIsGenerating(true)
        setGhostText('')
        
        try {
          const res = await fetch('/api/ai/autocomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              content: blocks.map(b => b.content).join('\n\n'),
              blockContext: content
            })
          })

          if (!res.ok) throw new Error('API failed')
          
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
                    setGhostText(generated)
                  }
                } catch {}
              }
            }
          }
        } catch (err) {
          console.error('Autocomplete failed', err)
        } finally {
          setIsGenerating(false)
        }
      }
    }, 800)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const block = blocks[index]

    if (e.key === 'Tab' && ghostText && activeBlockId === block.id) {
      e.preventDefault()
      updateBlock(block.id, block.content + ghostText)
      setGhostText('')
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const newBlock: Block = { id: crypto.randomUUID(), type: 'p', content: '' }
      const newBlocks = [...blocks]
      newBlocks.splice(index + 1, 0, newBlock)
      setBlocks(newBlocks)
      
      setTimeout(() => {
        blockRefs.current[newBlock.id]?.focus()
        setActiveBlockId(newBlock.id)
      }, 10)
    }

    if (e.key === 'Backspace' && block.content === '' && index > 0) {
      e.preventDefault()
      const newBlocks = [...blocks]
      newBlocks.splice(index, 1)
      setBlocks(newBlocks)
      const prevBlock = blocks[index - 1]
      setTimeout(() => {
        const el = blockRefs.current[prevBlock.id]
        if (el) {
          el.focus()
          el.setSelectionRange(el.value.length, el.value.length)
        }
        setActiveBlockId(prevBlock.id)
      }, 10)
    }
  }

  const startWriting = async () => {
    setGeneratingOutline(true)
    let initialBlocks: Block[] = []

    if (outlineType === 'none') {
      initialBlocks = [{ id: crypto.randomUUID(), type: 'p', content: '' }]
    } else {
      try {
        const res = await fetch('/api/ai/outline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: docPrompt || 'Untitled', type: outlineType })
        })
        const data = await res.json()
        
        if (data.headings && Array.isArray(data.headings)) {
          data.headings.forEach((heading: string) => {
            initialBlocks.push({ id: crypto.randomUUID(), type: 'h2', content: heading })
            initialBlocks.push({ id: crypto.randomUUID(), type: 'p', content: '' })
          })
        }
      } catch (err) {
        console.error('Outline failed', err)
      }

      if (initialBlocks.length === 0) {
        initialBlocks = [{ id: crypto.randomUUID(), type: 'p', content: '' }]
      }
    }

    setBlocks(initialBlocks)
    setShowWizard(false)
    setGeneratingOutline(false)
    if (docPrompt && !title) setTitle(docPrompt)
  }

  if (loading) return <div className="p-8 text-center"><div className="animate-pulse h-10 w-32 bg-slate-200 rounded mx-auto" /></div>
  if (!document) return <div className="p-8 text-center text-xl font-bold">Document not found</div>

  return (
    <>
      <div className="flex h-screen bg-[#f8f9fa] overflow-hidden">
        
        {/* Main Editor */}
        <div className="flex-1 flex flex-col h-full bg-white relative">
          
          {/* Top Layer: Title & Share */}
          <div className="flex items-center justify-between px-6 py-3 bg-white">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/research')} className="text-[#595c5e] hover:text-[#2c2f31] transition-colors">
                <ArrowLeft size={18} />
              </button>
              <div className="text-sm font-bold text-[#2c2f31] truncate max-w-[200px]">{title || 'Untitled'}</div>
              <div className="text-xs text-[#595c5e] ml-2">
                {saving ? <span className="flex items-center gap-1 text-[#6366f1]"><Loader2 size={12} className="animate-spin"/> Saving...</span> : 'Saved'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-sm font-bold text-[#595c5e] hover:text-[#2c2f31] transition-colors hidden md:flex">
                <Share size={16} /> Share
              </button>
              <button className="flex items-center gap-2 text-sm font-bold text-[#595c5e] hover:text-[#2c2f31] transition-colors hidden md:flex">
                <ShieldCheck size={16} /> Review
              </button>
              {!profile?.is_pro && (
                <button onClick={() => setShowProModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366f1] text-white text-sm font-bold rounded-lg hover:bg-[#4f46e5] shadow-sm transition-colors">
                  <Zap size={14} fill="currentColor" /> See Pricing
                </button>
              )}
              <button className="text-[#595c5e] hover:bg-slate-100 p-1 rounded-md transition-colors"><MoreHorizontal size={18}/></button>
            </div>
          </div>

          {/* Bottom Layer: Formatting Toolbar */}
          <div className="flex items-center justify-between px-6 py-2 border-y border-slate-100 bg-white sticky top-0 z-20 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1 shrink-0">
              <button className="p-1.5 rounded text-slate-400 hover:bg-slate-100 transition-colors"><Undo size={16} /></button>
              <button className="p-1.5 rounded text-slate-400 hover:bg-slate-100 transition-colors"><Redo size={16} /></button>
              
              <div className="w-px h-5 bg-slate-200 mx-2 hidden sm:block"></div>
              
              <button className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 text-sm font-medium text-[#2c2f31] transition-colors">
                <Type size={16} className="text-slate-500" /> Text <ChevronDown size={14} className="text-slate-400"/>
              </button>
              
              <div className="w-px h-5 bg-slate-200 mx-2 hidden sm:block"></div>
              
              <div className="flex items-center hidden sm:flex">
                <button className="p-1.5 rounded text-[#2c2f31] hover:bg-slate-100 font-serif font-bold transition-colors">B</button>
                <button className="p-1.5 rounded text-[#2c2f31] hover:bg-slate-100 font-serif italic transition-colors">I</button>
                <button className="p-1.5 rounded text-[#2c2f31] hover:bg-slate-100 font-serif underline transition-colors">U</button>
                <button className="p-1.5 rounded text-[#2c2f31] hover:bg-slate-100 font-serif line-through transition-colors">S</button>
                <button className="p-1.5 rounded text-[#595c5e] hover:bg-slate-100 transition-colors ml-1"><Code size={16} /></button>
                <button className="p-1.5 rounded text-[#595c5e] hover:bg-slate-100 transition-colors"><Superscript size={16} /></button>
                <button className="p-1.5 rounded text-[#595c5e] hover:bg-slate-100 transition-colors"><Subscript size={16} /></button>
                <button className="p-1.5 rounded text-[#595c5e] hover:bg-slate-100 transition-colors"><Link size={16} /></button>
                <button className="p-1.5 rounded text-[#595c5e] hover:bg-slate-100 transition-colors"><Highlighter size={16} /></button>
              </div>
              
              <div className="w-px h-5 bg-slate-200 mx-2 hidden md:block"></div>
              
              <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 text-sm font-medium text-[#2c2f31] transition-colors">
                <AtSign size={14} className="text-slate-500" /> Cite
              </button>
              
              <div className="w-px h-5 bg-slate-200 mx-2 hidden lg:block"></div>
              
              <div className="flex items-center hidden lg:flex">
                <button className="p-1.5 rounded text-slate-500 hover:bg-slate-100 transition-colors"><Image size={16} /></button>
                <button className="p-1.5 rounded text-slate-500 hover:bg-slate-100 transition-colors"><Table size={16} /></button>
                <button className="p-1.5 rounded text-slate-500 hover:bg-slate-100 transition-colors"><Square size={16} /></button>
                <button className="p-1.5 rounded text-slate-500 hover:bg-slate-100 transition-colors"><Sigma size={16} /></button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm font-medium text-[#595c5e] ml-4 shrink-0">
              Autocomplete
              <button className="w-8 h-4 bg-[#6366f1] rounded-full relative transition-colors"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto relative custom-scrollbar pb-[40vh]">
            {showWizard ? (
              <div className="max-w-2xl mx-auto mt-16 px-8">
                <input 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Untitled"
                  className="w-full text-4xl font-extrabold text-[#2c2f31] border-none focus:ring-0 p-0 bg-transparent mb-8 placeholder:text-slate-200"
                />

                <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden mb-8">
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[#2c2f31] flex items-center gap-2"><FileText size={18} className="text-[#006094]"/> Fill document prompt</h3>
                    </div>
                    <textarea 
                      value={docPrompt}
                      onChange={e => setDocPrompt(e.target.value)}
                      placeholder="E.g., A research paper on the effects of climate change on marine biodiversity"
                      className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-[#006094] focus:border-transparent transition-all text-[#2c2f31]"
                    />
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[#2c2f31] flex items-center gap-2"><List size={18} className="text-[#006094]"/> Generate outline</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <button 
                        onClick={() => setOutlineType('imrad')}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 ${outlineType === 'imrad' ? 'border-[#6366f1] bg-[#6366f1]/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                      >
                        <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${outlineType === 'imrad' ? 'border-[#6366f1]' : 'border-slate-300'}`}>
                          {outlineType === 'imrad' && <div className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />}
                        </div>
                        <div>
                          <div className="font-bold text-[#2c2f31]">Standard headings (IMRaD)</div>
                          <div className="text-sm text-[#595c5e]">Add standard headings (Introduction, Methods, Results etc.)</div>
                        </div>
                      </button>

                      <button 
                        onClick={() => setOutlineType('smart')}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 ${outlineType === 'smart' ? 'border-[#6366f1] bg-[#6366f1]/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                      >
                        <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${outlineType === 'smart' ? 'border-[#6366f1]' : 'border-slate-300'}`}>
                          {outlineType === 'smart' && <div className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />}
                        </div>
                        <div>
                          <div className="font-bold text-[#2c2f31]">Smart headings</div>
                          <div className="text-sm text-[#595c5e]">AI will generate headings based on your document prompt</div>
                        </div>
                      </button>

                      <button 
                        onClick={() => setOutlineType('none')}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 ${outlineType === 'none' ? 'border-[#6366f1] bg-[#6366f1]/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                      >
                        <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${outlineType === 'none' ? 'border-[#6366f1]' : 'border-slate-300'}`}>
                          {outlineType === 'none' && <div className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />}
                        </div>
                        <div>
                          <div className="font-bold text-[#2c2f31]">No headings</div>
                          <div className="text-sm text-[#595c5e]">Start with a blank document</div>
                        </div>
                      </button>
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                      <button 
                        onClick={() => startWriting()}
                        className="px-6 py-2.5 text-[#595c5e] font-bold hover:text-[#2c2f31] transition-colors"
                      >
                        Skip and start writing
                      </button>
                      <button 
                        onClick={() => startWriting()}
                        disabled={generatingOutline}
                        className="px-8 py-2.5 bg-[#6366f1] text-white font-bold rounded-xl shadow-lg shadow-[#6366f1]/20 hover:-translate-y-0.5 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        {generatingOutline ? <Loader2 size={18} className="animate-spin" /> : null}
                        Start Writing
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto mt-16 px-8 relative">
                <input 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Untitled"
                  className="w-full text-4xl font-extrabold text-[#2c2f31] border-none focus:ring-0 p-0 bg-transparent mb-8 placeholder:text-slate-200"
                />

                <div className="space-y-4">
                  {blocks.map((block, index) => (
                    <div key={block.id} className="relative group">
                      {block.type === 'h2' ? (
                        <textarea
                          ref={el => {
                            blockRefs.current[block.id] = el
                            resizeTextarea(el)
                          }}
                          value={block.content}
                          onChange={e => {
                            updateBlock(block.id, e.target.value)
                            resizeTextarea(e.target.value === '' ? null : e.target)
                          }}
                          onKeyDown={e => handleKeyDown(e, index)}
                          onFocus={() => setActiveBlockId(block.id)}
                          placeholder="Heading 2"
                          className="w-full resize-none border-none focus:ring-0 bg-transparent text-2xl font-bold text-[#2c2f31] p-0 placeholder:text-slate-300 overflow-hidden"
                          rows={1}
                        />
                      ) : (
                        <div className="relative">
                          <textarea
                            ref={el => {
                              blockRefs.current[block.id] = el
                              resizeTextarea(el)
                            }}
                            value={block.content}
                            onChange={e => {
                              updateBlock(block.id, e.target.value)
                              resizeTextarea(e.target.value === '' ? null : e.target)
                            }}
                            onKeyDown={e => handleKeyDown(e, index)}
                            onFocus={() => setActiveBlockId(block.id)}
                            placeholder="Type to write, or select text for AI commands..."
                            className="w-full resize-none border-none focus:ring-0 bg-transparent text-lg text-[#2c2f31] leading-relaxed p-0 placeholder:text-slate-300 overflow-hidden relative z-10"
                            rows={1}
                          />
                          
                          {/* Ghost Text Overlay for this block */}
                          {activeBlockId === block.id && ghostText && (
                            <div className="absolute top-0 left-0 right-0 pointer-events-none z-0">
                              <span className="text-lg leading-relaxed text-transparent whitespace-pre-wrap">{block.content}</span>
                              <span className="text-lg leading-relaxed text-[#a8aabc] whitespace-pre-wrap bg-[#f4f5f8] px-1 rounded animate-pulse">{ghostText}</span>
                              
                              {/* The Floating Jenni Tooltip */}
                              <div className="absolute mt-2 pointer-events-auto flex items-center gap-2 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 p-1.5 animate-in fade-in slide-in-from-top-2 z-50">
                                <button 
                                  onClick={() => {
                                    updateBlock(block.id, block.content + ghostText)
                                    setGhostText('')
                                    blockRefs.current[block.id]?.focus()
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-[#6366f1] text-white text-sm font-bold rounded-lg hover:bg-[#4f46e5] transition-colors"
                                >
                                  Accept <ArrowLeft size={14} className="rotate-180" />
                                </button>
                                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-[#595c5e] hover:bg-slate-100 rounded-lg transition-colors">
                                  <Sparkles size={14} /> Guide with thinking
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Block Type Indicator (Hover) */}
                      <div className="absolute -left-12 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400">
                          <MousePointer2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Context Sidebar */}
        <div className="w-[300px] border-l border-slate-200 bg-[#f8f9fa] flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="font-bold text-[#2c2f31] flex items-center gap-2">
              <BookOpen size={18} className="text-[#006094]" />
              Context Library
            </h2>
            <p className="text-xs text-[#595c5e] mt-1">Select documents to guide the AI</p>
          </div>

          {!profile?.is_pro ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-gradient-to-br from-[#006094] to-[#004a73] rounded-full flex items-center justify-center mb-4 shadow-lg text-white">
                <Crown size={28} className="text-yellow-400" />
              </div>
              <h3 className="font-bold text-[#2c2f31] mb-2">Pro Feature</h3>
              <p className="text-sm text-[#595c5e] mb-6">
                Upgrade to Pro to toggle PDFs as context. The AI will read your documents and write using your exact facts and terminology.
              </p>
              <button 
                onClick={() => setShowProModal(true)}
                className="px-6 py-2.5 bg-[#006094] text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5"
              >
                Upgrade to Pro
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <button className="w-full py-3 border-2 border-dashed border-[#006094]/30 rounded-xl text-[#006094] font-bold text-sm hover:bg-[#006094]/5 transition-colors mb-6">
                + Upload PDF Source
              </button>
              <p className="text-sm text-[#595c5e] text-center mt-10">Library context implementation coming soon.</p>
            </div>
          )}
        </div>
      </div>

      {showProModal && <ProModal onClose={() => setShowProModal(false)} />}
    </>
  )
}
