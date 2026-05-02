'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function PdfViewer({ url }: { url: string }) {
  const [pdf, setPdf] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    async function loadPdf() {
      try {
        const pdfjs = (window as any)['pdfjs-dist/build/pdf']
        if (!pdfjs) {
          setTimeout(loadPdf, 500) // Wait for CDN script to load
          return
        }
        
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'
        
        // We MUST use the proxy to bypass CORS restrictions from Supabase when fetching via JS
        const proxyUrl = `/api/proxy-document?url=${encodeURIComponent(url)}`
        const loadingTask = pdfjs.getDocument(proxyUrl)
        const loadedPdf = await loadingTask.promise
        
        if (isMounted) {
          setPdf(loadedPdf)
          setLoading(false)
        }
      } catch (err: any) {
        console.error('Failed to load PDF:', err)
        if (isMounted) {
          setError(err.message || 'Failed to load document')
          setLoading(false)
        }
      }
    }
    
    if (url) loadPdf()
    
    return () => { isMounted = false }
  }, [url])

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-[#595c5e] absolute inset-0">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#006094]" />
        <p className="font-bold">Rendering Native Engine...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[#595c5e] p-8 text-center absolute inset-0">
        <div>
          <p className="font-bold text-red-500 mb-2">Error rendering document</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-200/50 p-4 md:p-8 scroll-smooth">
      <div className="mx-auto flex flex-col items-center gap-6 max-w-5xl">
        {Array.from({ length: pdf.numPages }).map((_, i) => (
          <PdfPage key={i} pageNumber={i + 1} pdf={pdf} />
        ))}
      </div>
    </div>
  )
}

function PdfPage({ pageNumber, pdf }: { pageNumber: number, pdf: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    let isMounted = true
    let renderTask: any = null
    
    async function renderPage() {
      if (!canvasRef.current || rendered) return
      
      try {
        const page = await pdf.getPage(pageNumber)
        
        // Scale for crisp resolution on high DPI screens
        const scale = window.devicePixelRatio > 1 ? 2 : 1.5
        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        
        if (!context) return

        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }
        
        renderTask = page.render(renderContext)
        await renderTask.promise
        if (isMounted) setRendered(true)
      } catch (err: any) {
        if (err.name === 'RenderingCancelledException') return
        console.error(`Error rendering page ${pageNumber}:`, err)
      }
    }

    renderPage()
    
    return () => { 
      isMounted = false 
      if (renderTask) renderTask.cancel()
    }
  }, [pageNumber, pdf, rendered])

  return (
    <div className="relative bg-white shadow-md shrink-0 w-full max-w-[800px] aspect-[1/1.414]">
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        className={`w-full h-full block transition-opacity duration-300 ${rendered ? 'opacity-100' : 'opacity-0'}`} 
      />
    </div>
  )
}
