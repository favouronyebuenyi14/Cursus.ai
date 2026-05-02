import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f7f9] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-black text-[#006094] mb-4">404</h1>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Page not found</h2>
      <p className="text-slate-500 mb-8 text-center max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/" className="px-6 py-3 bg-[#006094] text-white font-bold rounded-lg hover:opacity-90 transition-all">
        Back to home
      </Link>
    </div>
  )
}
