'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const LEVELS = ['100L', '200L', '300L', '400L', '500L', '600L', '700L']

interface CourseInput { code: string; name: string }

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [faculty, setFaculty] = useState('')
  const [department, setDepartment] = useState('')
  const [level, setLevel] = useState('')
  const [courses, setCourses] = useState<CourseInput[]>([{ code: '', name: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addCourse() {
    if (courses.length < 8) setCourses([...courses, { code: '', name: '' }])
  }

  function removeCourse(i: number) {
    setCourses(courses.filter((_, idx) => idx !== i))
  }

  function updateCourse(i: number, field: keyof CourseInput, val: string) {
    const updated = [...courses]
    updated[i][field] = val
    setCourses(updated)
  }

  async function handleFinish() {
    setError('')
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: user.id,
        full_name: fullName,
        role: 'university_student',
        university,
        faculty,
        department,
        level,
      })
      if (profileError) throw profileError

      const validCourses = courses.filter(c => c.code && c.name)
      if (validCourses.length > 0) {
        const { error: courseError } = await supabase.from('courses').insert(
          validCourses.map(c => ({ user_id: user.id, course_code: c.code.toUpperCase(), course_name: c.name, semester: 'current' }))
        )
        if (courseError) throw courseError
      }

      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const fade = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] flex-col" style={{background: 'linear-gradient(135deg, #0F172A 0%, #020617 100%)'}}>
        <div className="flex-1 flex flex-col justify-between p-12" style={{backgroundImage: 'radial-gradient(#ffffff22 1px, transparent 1px)', backgroundSize: '24px 24px'}}>
          <div className="text-white font-bold text-3xl tracking-tighter">Cursus</div>
          <div className="text-center">
            <h1 className="text-white text-5xl font-extrabold">Set Up Your Academic Profile.</h1>
            <p className="text-slate-300 text-xl font-light">Tell us about yourself so Cursus can personalize your experience from day one.</p>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 bg-slate-600 rounded-full mr-2"></div>
              <div className="w-10 h-10 bg-slate-600 rounded-full mr-2"></div>
              <div className="w-10 h-10 bg-slate-600 rounded-full"></div>
            </div>
            <p className="text-slate-300 text-sm">Trusted by 12,000+ Nigerian students</p>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-[#0F172A]' : 'bg-slate-200'}`} />
            ))}
          </div>
          <AnimatePresence mode="wait">
            {/* Step 1: Name + University */}
            {step === 1 && (
              <motion.div key="step1" {...fade}>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Step 1 of 3</p>
                <h1 className="text-slate-900 font-bold mb-6">Tell us about yourself</h1>
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-700 text-sm font-semibold block mb-1.5">Full name</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Chidi Okonkwo"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900" />
                  </div>
                  <div>
                    <label className="text-slate-700 text-sm font-semibold block mb-1.5">University</label>
                    <input value={university} onChange={e => setUniversity(e.target.value)}
                      placeholder="e.g. University of Lagos"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900" />
                  </div>
                </div>
                <button onClick={() => setStep(2)} disabled={!fullName || !university}
                  className="w-full mt-6 bg-[#0F172A] text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                  Continue <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* Step 2: Faculty + Level */}
            {step === 2 && (
              <motion.div key="step2" {...fade}>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Step 2 of 3</p>
                <h1 className="text-slate-900 font-bold mb-6">Your department</h1>
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-700 text-sm font-semibold block mb-1.5">Faculty</label>
                    <input value={faculty} onChange={e => setFaculty(e.target.value)}
                      placeholder="e.g. Faculty of Science"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900" />
                  </div>
                  <div>
                    <label className="text-slate-700 text-sm font-semibold block mb-1.5">Department</label>
                    <input value={department} onChange={e => setDepartment(e.target.value)}
                      placeholder="e.g. Biochemistry"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900" />
                  </div>
                  <div>
                    <label className="text-slate-700 text-sm font-semibold block mb-1.5">Current level</label>
                    <div className="grid grid-cols-4 gap-2">
                      {LEVELS.map(l => (
                        <button key={l} onClick={() => setLevel(l)}
                          className={`py-2.5 rounded-lg text-sm font-medium transition-all border ${level === l ? 'bg-[#0F172A] text-white border-[#0F172A]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">Back</button>
                  <button onClick={() => setStep(3)} disabled={!faculty || !department || !level}
                    className="flex-1 bg-[#0F172A] text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Courses */}
            {step === 3 && (
              <motion.div key="step3" {...fade}>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Step 3 of 3</p>
                <h1 className="text-slate-900 font-bold mb-2">Your courses</h1>
                <p className="text-slate-600 text-sm mb-6">Add your courses this semester. Up to 8.</p>
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {courses.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={c.code} onChange={e => updateCourse(i, 'code', e.target.value)}
                        placeholder="BCH 301"
                        className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 uppercase" />
                      <input value={c.name} onChange={e => updateCourse(i, 'name', e.target.value)}
                        placeholder="Course name"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900" />
                      {courses.length > 1 && (
                        <button onClick={() => removeCourse(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {courses.length < 8 && (
                  <button onClick={addCourse} className="mt-3 flex items-center gap-1.5 text-slate-900 font-medium text-sm transition-colors">
                    <Plus size={14} /> Add another course
                  </button>
                )}
                {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">Back</button>
                  <button onClick={handleFinish} disabled={loading}
                    className="flex-1 bg-[#0F172A] text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-all">
                    {loading ? 'Setting up...' : "Let's go! 🎉"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
