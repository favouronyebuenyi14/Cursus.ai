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

    if (!profile?.is_pro) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('updated_at', today.toISOString())
      if ((count || 0) >= 5) {
        return NextResponse.json({ error: 'Daily limit reached. Upgrade to Pro for unlimited note expansions.' }, { status: 403 })
      }
    }

    const { rawContent, noteId } = await req.json()
    if (!rawContent) {
      return NextResponse.json({ error: 'Note content required' }, { status: 400 })
    }

    const stream = await groq.chat.completions.create({
      model: MODEL,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.noteExpansion },
        { role: 'user', content: `Here are my notes to expand:\n\n${rawContent}` },
      ],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            fullResponse += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()

        // Save expanded content back to note
        if (noteId) {
          supabase.from('notes').update({ ai_expanded_content: fullResponse })
            .eq('id', noteId).eq('user_id', user.id).then(() => {})
        }
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
    console.error('Note expansion error:', error)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
