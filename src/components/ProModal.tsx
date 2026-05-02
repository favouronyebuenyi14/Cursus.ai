'use client'

import { Crown, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 backdrop-blur-sm"
        >
          <X size={20} />
        </button>

        <div className="bg-gradient-to-br from-[#006094] to-[#004a73] px-8 py-10 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <Crown size={32} className="text-yellow-400" />
          </div>
          <h2 className="mb-2 text-2xl font-extrabold">Upgrade to Pro</h2>
          <p className="text-[#eef1f3]">
            You've reached your daily AI limit. Upgrade to unlock unlimited AI powers.
          </p>
        </div>

        <div className="p-8 bg-slate-50">
          <ul className="mb-8 space-y-3 text-sm font-medium text-[#2c2f31]">
            <li className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#006094]" />
              Unlimited Chat with any Document
            </li>
            <li className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#006094]" />
              Unlimited Audio Transcriptions
            </li>
            <li className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#006094]" />
              Permanent Document Storage (Never clears)
            </li>
          </ul>

          <button 
            onClick={() => {
              onClose()
              router.push('/dashboard') // Or billing page
            }}
            className="w-full rounded-xl bg-[#006094] py-3.5 font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  )
}
