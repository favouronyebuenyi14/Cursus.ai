'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, BookOpen, Mic, FileText, Target, PenTool, Camera, CheckCircle, Star } from 'lucide-react'

export default function MarketingPage() {
  const [secondaryWaitlist, setSecondaryWaitlist] = useState(false)
  const [teacherWaitlist, setTeacherWaitlist] = useState(false)
  const [secondaryEmail, setSecondaryEmail] = useState('')
  const [teacherEmail, setTeacherEmail] = useState('')
  const [loadingSecondary, setLoadingSecondary] = useState(false)
  const [loadingTeacher, setLoadingTeacher] = useState(false)
  const [submittedSecondary, setSubmittedSecondary] = useState(false)
  const [submittedTeacher, setSubmittedTeacher] = useState(false)

  async function handleSecondaryWaitlist(e: React.FormEvent) {
    e.preventDefault()
    setLoadingSecondary(true)
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: secondaryEmail, role: 'secondary_student' }),
    })
    setSubmittedSecondary(true)
    setLoadingSecondary(false)
  }

  async function handleTeacherWaitlist(e: React.FormEvent) {
    e.preventDefault()
    setLoadingTeacher(true)
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: teacherEmail, role: 'teacher' }),
    })
    setSubmittedTeacher(true)
    setLoadingTeacher(false)
  }

  return (
    <>
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50" style={{background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.05)'}}>
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-bold tracking-tighter text-primary font-headline">Cursus</div>
          <div className="hidden md:flex space-x-8 items-center">
            <a className="text-slate-500 hover:text-primary transition-colors text-sm font-medium" href="#features">Features</a>
            <a className="text-slate-500 hover:text-primary transition-colors text-sm font-medium" href="#pricing">Pricing</a>
            <a className="text-slate-500 hover:text-primary transition-colors text-sm font-medium" href="#waitlist">Waitlist</a>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-slate-600 hover:text-primary transition-colors px-4 py-2 text-sm font-medium">Log In</Link>
            <Link href="/signup" className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-95">Sign Up</Link>
          </div>
        </div>
      </nav>
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden px-6" style={{backgroundImage: 'radial-gradient(#00214711 1px, transparent 1px)', backgroundSize: '24px 24px'}}>
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-slate-100/50 blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-slate-50/50 blur-[120px]"></div>
          </div>
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Refining the Academic Experience of Nigerian Students</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-primary mb-6 leading-[1.1] tracking-tight">
              Your Academic <br/><span className="text-slate-400">Intelligence Atelier</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              The all-in-one AI workspace designed specifically for the unique challenges of Nigerian university students. Notes, exams, and research in one sanctuary.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto px-10 py-4 bg-primary text-white rounded-lg font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2">
                Get started free
                <ArrowRight size={20} />
              </Link>
              <a href="#features" className="w-full sm:w-auto px-10 py-4 bg-white text-primary border border-slate-200 rounded-lg font-bold text-lg hover:bg-slate-50 transition-all">See how it works</a>
            </div>
          </div>
        </section>
        {/* Feature Showcase (Bento Grid) */}
        <section className="py-24 px-6 bg-slate-50" id="features">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold text-primary mb-4 tracking-tight">Six tools. One platform.</h2>
              <p className="text-slate-500 text-lg">Every tool talks to every other tool.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Smart Notes */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all p-8 md:col-span-2">
                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-6 border border-slate-100">
                  <BookOpen className="text-primary" size={24} />
                </div>
                <h3 className="text-xl font-bold text-primary mb-3">Smart Notes</h3>
                <p className="text-slate-600 leading-relaxed">Write freely. AI expands, structures, and enriches your ideas into full academic notes. Say goodbye to fragmented thoughts and hello to comprehensive study guides.</p>
              </div>
              {/* Lecture Recorder */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all p-8">
                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-6 border border-slate-100">
                  <Mic className="text-primary" size={24} />
                </div>
                <h3 className="text-xl font-bold text-primary mb-3">Lecture Recorder</h3>
                <p className="text-slate-600 leading-relaxed">Record your lecturer. AI converts it into structured, study-ready notes automatically.</p>
              </div>
              {/* PDF Intelligence */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all p-8">
                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-6 border border-slate-100">
                  <FileText className="text-primary" size={24} />
                </div>
                <h3 className="text-xl font-bold text-primary mb-3">PDF Intelligence</h3>
                <p className="text-slate-600 leading-relaxed">Upload any material. Ask questions, get summaries, understand deeply.</p>
              </div>
              {/* Exam Prep */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all p-8 md:col-span-2 flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-6 border border-slate-100">
                    <Target className="text-primary" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-3">Exam Prep</h3>
                  <p className="text-slate-600 leading-relaxed">Upload past questions. AI identifies concentration areas and builds your reading plan based on historical data from Nigerian universities.</p>
                </div>
              </div>
              {/* Research Studio */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all p-8">
                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-6 border border-slate-100">
                  <PenTool className="text-primary" size={24} />
                </div>
                <h3 className="text-xl font-bold text-primary mb-3">Research Studio</h3>
                <p className="text-slate-600 leading-relaxed">AI-powered essay and research assistant. From outline to citations.</p>
              </div>
              {/* Snap & Ask */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all p-8 md:col-span-2">
                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-6 border border-slate-100">
                  <Camera className="text-primary" size={24} />
                </div>
                <h3 className="text-xl font-bold text-primary mb-3">Snap &amp; Ask</h3>
                <p className="text-slate-600 leading-relaxed">Photograph a question or calculation. Get a detailed, step-by-step answer instantly. Perfect for those midnight math problems.</p>
              </div>
            </div>
          </div>
        </section>
        {/* How it Works */}
        <section className="py-24 px-6 relative overflow-hidden bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-extrabold text-primary mb-20 text-center tracking-tight">How Cursus works</h2>
            <div className="space-y-32">
              {/* Step 01 */}
              <div className="flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1 text-center max-w-2xl mx-auto">
                  <span className="text-7xl font-black text-slate-100 mb-2 block font-headline">01</span>
                  <h3 className="text-3xl font-bold text-primary mb-6">Bring your materials</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">Upload PDFs, record lectures, write notes, or snap a question. Cursus accepts everything from your mobile or desktop.</p>
                </div>
              </div>
              {/* Step 02 */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                <div className="flex-1 text-center max-w-2xl mx-auto">
                  <span className="text-7xl font-black text-slate-100 mb-2 block font-headline">02</span>
                  <h3 className="text-3xl font-bold text-primary mb-6">AI connects the dots</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">Cursus links your notes, PDFs, and past questions for a course — so AI knows your full context and never hallucinates.</p>
                </div>
              </div>
              {/* Step 03 */}
              <div className="flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1 text-center max-w-2xl mx-auto">
                  <span className="text-7xl font-black text-slate-100 mb-2 block font-headline">03</span>
                  <h3 className="text-3xl font-bold text-primary mb-6">Study smarter</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">Get summaries, concentration areas, study notes, and answers tailored to your exact materials. High performance simplified.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Pricing Section */}
        <section className="py-24 px-6 bg-slate-50" id="pricing">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold text-primary mb-4 tracking-tight">Simple, honest pricing.</h2>
              <p className="text-slate-500 text-lg">Built for students. Priced accordingly.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Tier */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 flex flex-col">
                <h3 className="text-xl font-bold text-primary mb-2">Free</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-black text-primary">₦0</span>
                  <span className="text-slate-400 ml-2">/month</span>
                </div>
                <p className="text-sm text-slate-500 mb-10">Always free. Perfect for light study.</p>
                <ul className="space-y-5 mb-12 flex-grow">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="text-slate-300 mr-3" size={18} />
                    5 AI snaps per day
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="text-slate-300 mr-3" size={18} />
                    Up to 5 PDF uploads per day
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="text-slate-300 mr-3" size={18} />
                    Record up to 2 hours of lectures per day
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="text-slate-300 mr-3" size={18} />
                    Basic note writing
                  </li>
                </ul>
                <Link href="/signup" className="w-full py-4 rounded-lg border border-slate-200 hover:bg-slate-50 text-primary font-bold transition-all">Get started</Link>
              </div>
              {/* Pro Tier */}
              <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm p-10 flex flex-col ring-2 ring-primary/5 shadow-2xl shadow-slate-200">
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">Most Popular</div>
                <h3 className="text-xl font-bold text-primary mb-2">Cursus Pro</h3>
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-black text-primary">₦1500</span>
                  <span className="text-slate-400 ml-2">/month</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-10 italic uppercase tracking-wider">or ₦15,000/year — Save ₦3,600</p>
                <ul className="space-y-5 mb-12 flex-grow">
                  <li className="flex items-center text-sm">
                    <Star className="text-primary mr-3" size={18} />
                    Unlimited AI snaps
                  </li>
                  <li className="flex items-center text-sm">
                    <Star className="text-primary mr-3" size={18} />
                    Unlimited PDF uploads + Q&amp;A
                  </li>
                  <li className="flex items-center text-sm">
                    <Star className="text-primary mr-3" size={18} />
                    Unlimited lecture recording
                  </li>
                  <li className="flex items-center text-sm text-primary font-bold">
                    <Star className="text-primary mr-3" size={18} />
                    Research &amp; essay studio
                  </li>
                </ul>
                <Link href="/signup" className="w-full py-4 rounded-lg bg-primary text-white font-bold transition-all hover:opacity-90 shadow-lg active:scale-[0.98]">Upgrade to Pro</Link>
              </div>
            </div>
          </div>
        </section>
        {/* Testimonials */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-100 italic text-slate-600 shadow-sm">
                <p className="mb-8 leading-relaxed">"I stopped spending 3 hours summarising PDF handouts. Cursus does it in seconds..."</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white text-[10px]">CO</div>
                  <div>
                    <span className="text-xs font-bold text-primary block">Chidi O.</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">300L Medicine, UNILAG</span>
                  </div>
                </div>
              </div>
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-100 italic text-slate-600 shadow-sm">
                <p className="mb-8 leading-relaxed">"Recording my lecturer and getting structured notes was the one feature I didn't know I needed..."</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white text-[10px]">AN</div>
                  <div>
                    <span className="text-xs font-bold text-primary block">Amara N.</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">400L Law, OAU</span>
                  </div>
                </div>
              </div>
              <div className="p-8 rounded-xl bg-slate-50 border border-slate-100 italic text-slate-600 shadow-sm">
                <p className="mb-8 leading-relaxed">"Snap &amp; Ask saved me during a test prep. The step-by-step breakdown is better than my tutor."</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white text-[10px]">ES</div>
                  <div>
                    <span className="text-xs font-bold text-primary block">Emeka S.</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">200L Engineering, ABU Zaria</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* More Coming Soon */}
        <section className="py-24 px-6 border-y border-slate-100 bg-slate-50" id="waitlist">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-2xl font-bold text-primary tracking-tight">More Coming Soon</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-center justify-between p-10 rounded-xl bg-white border border-slate-200 group hover:border-primary transition-all shadow-sm">
                <div>
                  <h3 className="text-xl font-bold text-primary mb-2">For Secondary School</h3>
                  <p className="text-slate-500 text-sm">WAEC, NECO, JAMB personalized prep.</p>
                </div>
                {!secondaryWaitlist ? (
                  <button onClick={() => setSecondaryWaitlist(true)} className="px-6 py-2 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-all text-sm font-bold active:scale-95">Join Waitlist</button>
                ) : submittedSecondary ? (
                  <div className="text-green-600 text-sm font-bold">Thank you!</div>
                ) : (
                  <form onSubmit={handleSecondaryWaitlist} className="flex gap-2">
                    <input
                      type="email"
                      value={secondaryEmail}
                      onChange={(e) => setSecondaryEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      required
                    />
                    <button type="submit" disabled={loadingSecondary} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50">
                      {loadingSecondary ? '...' : 'Join'}
                    </button>
                  </form>
                )}
              </div>
              <div className="flex items-center justify-between p-10 rounded-xl bg-white border border-slate-200 group hover:border-primary transition-all shadow-sm">
                <div>
                  <h3 className="text-xl font-bold text-primary mb-2">For Teachers &amp; Lecturers</h3>
                  <p className="text-slate-500 text-sm">AI lesson plans &amp; quiz builder.</p>
                </div>
                {!teacherWaitlist ? (
                  <button onClick={() => setTeacherWaitlist(true)} className="px-6 py-2 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-all text-sm font-bold active:scale-95">Join Waitlist</button>
                ) : submittedTeacher ? (
                  <div className="text-green-600 text-sm font-bold">Thank you!</div>
                ) : (
                  <form onSubmit={handleTeacherWaitlist} className="flex gap-2">
                    <input
                      type="email"
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      required
                    />
                    <button type="submit" disabled={loadingTeacher} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50">
                      {loadingTeacher ? '...' : 'Join'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
        {/* Closing CTA */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-4xl mx-auto bg-slate-50 rounded-2xl p-12 text-center relative overflow-hidden border border-slate-200 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-primary mb-8 relative z-10 leading-tight tracking-tight">Your grades don't have to depend on luck.</h2>
            <p className="text-slate-600 mb-12 text-lg max-w-2xl mx-auto relative z-10 leading-relaxed">Join thousands of Nigerian students already studying smarter with the world's first localized academic AI.</p>
            <Link href="/signup" className="px-12 py-5 bg-primary text-white rounded-lg font-black text-xl hover:opacity-90 active:scale-[0.98] transition-all relative z-10 shadow-xl">Get started free</Link>
          </div>
        </section>
      </main>
      {/* Footer */}
      <footer className="bg-white w-full py-16 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="col-span-1 lg:col-span-1">
            <span className="text-2xl font-bold text-primary mb-6 block tracking-tighter">Cursus</span>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">Revolutionizing academic success for African students through purposeful artificial intelligence.</p>
          </div>
          <div>
            <h4 className="text-primary text-sm font-bold uppercase tracking-widest mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li><a className="text-slate-500 hover:text-primary transition-colors text-sm" href="#features">Features</a></li>
              <li><a className="text-slate-500 hover:text-primary transition-colors text-sm" href="#pricing">Pricing</a></li>
              <li><a className="text-slate-500 hover:text-primary transition-colors text-sm" href="#waitlist">Waitlist</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary text-sm font-bold uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><a className="text-slate-500 hover:text-primary transition-colors text-sm" href="#">Privacy Policy</a></li>
              <li><a className="text-slate-500 hover:text-primary transition-colors text-sm" href="#">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary text-sm font-bold uppercase tracking-widest mb-6">Support</h4>
            <ul className="space-y-4">
              <li><a className="text-slate-500 hover:text-primary transition-colors text-sm" href="#">Contact Us</a></li>
              <li><a className="text-slate-500 hover:text-primary transition-colors text-sm" href="#">FAQ</a></li>
              <li><a className="text-slate-500 hover:text-primary transition-colors text-sm" href="#">Student Ambassadors</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-100 text-center">
          <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em]">© 2026 Cursus AI Academic Workspace. All rights reserved.</p>
        </div>
      </footer>
    </>
  )
}
