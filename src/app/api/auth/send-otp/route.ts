import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { genAI, MODEL, SYSTEM_PROMPTS } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('is_pro').eq('user_id', user.id).single()
    if (!profile?.is_pro) return NextResponse.json({ error: 'Pro required' }, { status: 403 })

    const { content, title } = await req.json()
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })

    const model = genAI.getGenerativeModel({ model: MODEL })
    const prompt = `${SYSTEM_PROMPTS.noteExpansion}\n\nTitle: ${title || 'Untitled'}\n\nNotes:\n${content}`
    const result = await model.generateContentStream(prompt)

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('Expand notes error:', error)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
