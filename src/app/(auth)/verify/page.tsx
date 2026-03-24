'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, ArrowRight, GraduationCap, Users } from 'lucide-react'

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

  if (verified) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 bg-gradient-to-br from-teal-400/10 to-purple-600/10 flex items-center justify-center p-8">
          <div className="text-center">
            <CheckCircle size={64} className="text-teal-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Verification successful!</h1>
            <p className="text-white/60">Redirecting you {needsOnboarding ? 'to onboarding' : 'to dashboard'}...</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-teal-400/20 rounded-full flex items-center justify-center mr-2">
                <GraduationCap size={24} className="text-teal-400" />
              </div>
              <div className="w-12 h-12 bg-purple-400/20 rounded-full flex items-center justify-center mr-2">
                <Users size={24} className="text-purple-400" />
              </div>
              <div className="w-12 h-12 bg-pink-400/20 rounded-full flex items-center justify-center">
                <ArrowRight size={24} className="text-pink-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">Account verified</h2>
            <p className="text-white/50">You can now access all features</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 bg-gradient-to-br from-teal-400/10 to-purple-600/10 flex items-center justify-center p-8">
        <div className="text-center">
          <GraduationCap size={64} className="text-teal-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Verify your account</h1>
          <p className="text-white/60">Enter the 6-digit code sent to your {method === 'email' ? 'email' : 'phone'}</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold"><span className="text-teal-400">C</span>ursus</Link>
          </div>
          <div className="glass-card p-8">
            <Link href="/auth/signup" className="flex items-center gap-1 text-white/40 text-sm hover:text-white/60 mb-6 transition-colors">
              <ArrowLeft size={14} /> Back
            </Link>
            <h1 className="text-2xl font-bold mb-2">Check your {method === 'email' ? 'inbox' : 'messages'}</h1>
            <p className="text-white/50 text-sm mb-8">
              We sent a 6-digit code to <span className="text-white/80 font-medium">{maskedValue}</span>. It expires in 15 minutes.
            </p>
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
                  className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-white/5 text-white focus:outline-none transition-all ${
                    digit ? 'border-teal-400/50 bg-teal-400/5' : 'border-white/10 focus:border-teal-400/40'
                  } ${error ? 'border-red-400/50' : ''}`}
                />
              ))}
            </div>
            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
            <button
              onClick={() => handleVerify()}
              disabled={loading || otp.some(d => !d)}
              className="w-full bg-teal-400 text-[#0A0F1C] font-bold py-3.5 rounded-xl hover:bg-teal-300 transition-colors disabled:opacity-50 mb-4"
            >
              {loading ? 'Verifying...' : 'Verify and continue'}
            </button>
            <p className="text-center text-white/40 text-sm">
              Didn&apos;t receive it?{' '}
              {resendCooldown > 0 ? (
                <span>Resend in {resendCooldown}s</span>
              ) : (
                <button onClick={handleResend} className="text-teal-400 hover:underline">Resend code</button>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center"><div className="text-white/40">Loading...</div></div>}>
      <VerifyForm />
    </Suspense>
  )
}
