'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoading(false)
      if (data.session) router.replace('/dashboard')
    })
  }, [router, supabase])

  async function handleSend() {
    if (!email) return
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email', value: email, isLogin: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send code')
      router.push(`/verify?method=email&value=${encodeURIComponent(email)}&role=existing`)
    } catch (e: any) {
      setError(e.message)
    }
    setSending(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  if (loading) return (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-slate-400 text-sm">Loading...</div>
  </div>
  )
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:col-span-5 p-16 flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #020617 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(#ffffff22 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative z-10">
          <span className="text-white text-3xl font-bold tracking-tighter">Cursus</span>
        </div>
        <div className="relative z-10 space-y-8">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white">
            Your Academic <br /> Intelligence{' '}
            <span className="text-slate-400">Atelier.</span>
          </h1>
          <p className="text-slate-300 text-xl max-w-md font-light leading-relaxed">
            A premium curated workspace designed for high-performance scholars to centralize
            research, lectures, and notes.
          </p>
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full text-white text-sm border border-white/10">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Trusted by 12,000+ Nigerian students
            </div>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-4 text-sm text-slate-400">
          <div className="flex -space-x-2">
            {['A', 'B', 'C'].map((l) => (
              <div
                key={l}
                className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-600 flex items-center justify-center text-white text-xs font-bold"
              >
                {l}
              </div>
            ))}
          </div>
          <span className="ml-2">Join the academic elite</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="col-span-1 lg:col-span-7 flex items-center justify-center p-8 md:p-16 bg-white">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-lg">
              Enter your institutional credentials to continue.
            </p>
          </div>

          <div className="space-y-6">
            {/* Email input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 px-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="student@unilag.edu.ng"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-12 pr-4 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={handleSend}
              disabled={sending || !email}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-lg shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? 'Sending...' : <>Get Access Code <ArrowRight size={18} /></>}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogle}
              className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3 font-semibold"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google Workspace
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 pt-4">
            By signing in, you agree to our{' '}
            <Link href="#" className="text-slate-900 font-semibold hover:underline">
              Terms of Service
            </Link>
          </p>

          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-slate-900 font-semibold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}