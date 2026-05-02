'use client'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#f5f7f9] flex flex-col items-center justify-center px-4">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong</h2>
      <p className="text-slate-500 mb-8 text-center max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-[#006094] text-white font-bold rounded-lg hover:opacity-90 transition-all"
      >
        Try again
      </button>
    </div>
  )
}
