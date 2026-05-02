import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq, MODEL, SYSTEM_PROMPTS } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('is_pro').eq('user_id', user.id).single()

    const { documentText, question, summaryType } = await req.json()
    if (!documentText) return NextResponse.json({ error: 'Document content required' }, { status: 400 })

    if (!profile?.is_pro) {
      if (summaryType === 'comprehensive') {
        return NextResponse.json({ error: 'Comprehensive summaries require Pro.' }, { status: 403 })
      }
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
      if ((count || 0) >= 1 && !question) {
        return NextResponse.json({ error: 'Daily PDF limit reached. Upgrade to Pro.' }, { status: 403 })
      }
    }

    let userPrompt: string
    if (summaryType === 'quick') {
      userPrompt = `Please provide a concise 1-paragraph summary of this document:\n\n${documentText.slice(0, 8000)}`
    } else if (summaryType === 'comprehensive') {
      userPrompt = `Please provide a comprehensive summary broken down by sections with key points:\n\n${documentText.slice(0, 15000)}`
    } else {
      userPrompt = question || 'Summarise this document.'
    }

    const stream = await groq.chat.completions.create({
      model: MODEL,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.pdfChat },
        {
          role: 'user',
          content: `Document content:\n\n${documentText.slice(0, 12000)}\n\n---\n\n${userPrompt}`
        },
      ],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
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
    console.error('PDF chat error:', error)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
