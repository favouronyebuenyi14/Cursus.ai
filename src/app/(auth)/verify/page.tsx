'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, ArrowRight } from 'lucide-react'

function VerifyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const method = params.get('method')
  const value = params.get('value') || ''
  const role = params.get('role')

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [verified, setVerified] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendCooldown])

  function handleChange(index: number, val: string) {
    if (!/^\d*$/.test(val)) return
    const newOtp = [...otp]
    newOtp[index] = val.slice(-1)
    setOtp(newOtp)
    if (val && index < 5) inputs.current[index + 1]?.focus()
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      handleVerify(pasted)
    }
  }

  async function handleVerify(code?: string) {
    const finalCode = code || otp.join('')
    if (finalCode.length < 6) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, value, code: finalCode, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')
      setNeedsOnboarding(data.needsOnboarding)
      setVerified(true)
      setTimeout(() => {
        if (data.needsOnboarding) router.push('/onboarding')
        else router.push('/dashboard')
      }, 2500)
    } catch (e: any) {
      setError(e.message)
      setOtp(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    }
    setLoading(false)
  }

  async function handleResend() {
    setResendCooldown(60)
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, value, role }),
    })
  }

  const maskedValue = method === 'email'
    ? value.replace(/(.{2}).*(@.*)/, '$1***$2')
    : value.replace(/(.{4}).*(.{4})/, '$1****$2')

  // Success screen
  if (verified) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">
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
          <div className="relative z-10 space-y-6">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white">
              Your Academic <br /> Intelligence{' '}
              <span className="text-slate-400">Atelier.</span>
            </h1>
            <p className="text-slate-300 text-xl font-light leading-relaxed">
              A premium curated workspace designed for high-performance scholars.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-4 text-sm text-slate-400">
            <div className="flex -space-x-2">
              {['A', 'B', 'C', 'D'].map(l => (
                <div key={l} className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-600 flex items-center justify-center text-white text-xs font-bold">{l}</div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold">+12k</div>
            </div>
            <span className="ml-2">Trusted by 12,000+ Nigerian students</span>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-center p-8 bg-white">
          <div className="max-w-md w-full text-center">
            <div className="mb-10 inline-flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-ping scale-150" />
                <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse scale-125" />
                <div className="relative w-28 h-28 bg-blue-50 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <CheckCircle size={48} className="text-[#006094]" />
                </div>
              </div>
            </div>
            <div className="space-y-4 mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                Verification Successful
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed px-4">
                Your account has been verified. Redirecting you{' '}
                {needsOnboarding ? 'to set up your profile' : 'to your workspace'}...
              </p>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => router.push(needsOnboarding ? '/onboarding' : '/dashboard')}
                className="w-full bg-[#006094] text-white py-5 rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-[#005482] transition-all shadow-lg"
              >
                Enter Workspace <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <footer className="absolute bottom-8 text-slate-400 text-xs font-medium tracking-widest uppercase">
            Cursus Academic Atelier © 2025
          </footer>
        </div>
      </div>
    )
  }

  // OTP input screen
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
        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white">
            Your Academic <br /> Intelligence{' '}
            <span className="text-slate-400">Atelier.</span>
          </h1>
          <p className="text-slate-300 text-xl font-light leading-relaxed">
            A premium curated workspace designed for high-performance scholars.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-4 text-sm text-slate-400">
          <div className="flex -space-x-2">
            {['A', 'B', 'C'].map(l => (
              <div key={l} className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-600 flex items-center justify-center text-white text-xs font-bold">{l}</div>
            ))}
          </div>
          <span className="ml-2">Join the academic elite</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="col-span-1 lg:col-span-7 flex items-center justify-center p-8 md:p-16 bg-white">
        <div className="w-full max-w-md">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-8"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="space-y-3 mb-8">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">
              Check your {method === 'email' ? 'inbox' : 'messages'}
            </h2>
            <p className="text-slate-500 text-lg">
              We sent a 6-digit code to{' '}
              <span className="text-slate-900 font-semibold">{maskedValue}</span>.
              It expires in 15 minutes.
            </p>
          </div>

          {/* OTP inputs */}
          <div className="flex gap-3 justify-center mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-slate-50 text-slate-900 focus:outline-none transition-all ${
                  digit
                    ? 'border-slate-900 bg-white'
                    : 'border-slate-200 focus:border-slate-900 focus:bg-white'
                } ${error ? 'border-red-400' : ''}`}
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

          <button
            onClick={() => handleVerify()}
            disabled={loading || otp.some(d => !d)}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50 mb-4"
          >
            {loading ? 'Verifying...' : 'Verify and continue'}
          </button>

          <p className="text-center text-slate-500 text-sm">
            Didn&apos;t receive it?{' '}
            {resendCooldown > 0 ? (
              <span>Resend in {resendCooldown}s</span>
            ) : (
              <button
                onClick={handleResend}
                className="text-slate-900 font-semibold hover:underline"
              >
                Resend code
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  )
}