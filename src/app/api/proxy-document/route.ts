import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  
  if (!url) {
    return new NextResponse('Missing URL parameter', { status: 400 })
  }

  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      return new NextResponse('Failed to fetch document', { status: response.status })
    }

    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', 'inline; filename="document.pdf"')
    // Allow any origin to access this proxy (to bypass CORS for the client)
    headers.set('Access-Control-Allow-Origin', '*')

    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
