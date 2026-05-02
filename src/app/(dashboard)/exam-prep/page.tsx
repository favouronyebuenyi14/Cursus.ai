'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Target, BookCopy, Camera, BrainCircuit, ChevronRight } from 'lucide-react'

export default function ExamPrepDashboard() {
  const router = useRouter()

  const tools = [
    {
      id: 'mock-exam',
      title: 'Mock Exam Simulator',
      description: 'Generate a timed mock exam from your syllabus or library PDFs. Includes AI grading and feedback.',
      icon: Target,
      color: 'text-rose-600',
      bgColor: 'bg-rose-100',
      gradient: 'from-rose-500 to-pink-600',
      path: '/exam-prep/mock-exam'
    },
    {
      id: 'flashcards',
      title: 'Smart Flashcards',
      description: 'Upload a document and let AI extract key definitions and concepts into interactive flashcards.',
      icon: BookCopy,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      gradient: 'from-blue-500 to-cyan-600',
      path: '/exam-prep/flashcards'
    },
    {
      id: 'past-questions',
      title: 'Solve Past Questions',
      description: 'Snap a picture of a physical past question paper and get step-by-step solutions and explanations.',
      icon: Camera,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      gradient: 'from-purple-500 to-indigo-600',
      path: '/snap' // Routes to existing Snap & Ask feature
    },
    {
      id: 'eli5',
      title: 'Explain It Simply (ELI5)',
      description: 'Paste a confusing paragraph, formula, or concept and get it broken down with relatable analogies.',
      icon: BrainCircuit,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      gradient: 'from-emerald-500 to-teal-600',
      path: '/exam-prep/eli5'
    }
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24">
      {/* Header Banner */}
      <div className="bg-[#006094] px-6 py-16 md:px-12 relative overflow-hidden">
        {/* Abstract Background Patterns */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4eadf4]/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <Target size={24} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Exam Prep Center
            </h1>
          </div>
          <p className="text-blue-100 max-w-2xl text-lg mt-4 leading-relaxed">
            Ace your next exam. Generate mock tests, flashcards, and get complex concepts explained simply using our specialized academic AI.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-12 -mt-8 relative z-20">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {tools.map((tool) => (
            <motion.div 
              key={tool.id}
              variants={item}
              onClick={() => router.push(tool.path)}
              className="group cursor-pointer bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 relative overflow-hidden"
            >
              {/* Hover Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`}></div>
              
              <div className="flex items-start gap-5 relative z-10">
                <div className={`shrink-0 w-14 h-14 rounded-2xl ${tool.bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                  <tool.icon size={28} className={tool.color} />
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[#2c2f31] mb-2 group-hover:text-[#006094] transition-colors">
                    {tool.title}
                  </h2>
                  <p className="text-[#595c5e] text-sm leading-relaxed mb-4">
                    {tool.description}
                  </p>
                  
                  <div className="flex items-center text-sm font-bold text-[#006094] group-hover:translate-x-1 transition-transform">
                    {tool.id === 'past-questions' ? 'Go to Snap & Ask' : 'Start now'} 
                    <ChevronRight size={16} className="ml-1" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
