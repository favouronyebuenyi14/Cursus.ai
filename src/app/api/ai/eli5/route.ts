import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq, MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { concept } = await req.json()
    if (!concept) return NextResponse.json({ error: 'Concept required' }, { status: 400 })

    const systemPrompt = `You are a brilliant Nigerian university professor known for breaking down extremely complex concepts so that even a 5-year-old could understand them. 
    The student will provide a confusing academic paragraph, formula, or concept.
    Your job is to:
    1. Explain it in the simplest terms possible.
    2. Use a highly relatable, real-world analogy (bonus points if it's relatable to a Nigerian context, like traffic, food, or everyday life).
    3. Keep it brief and engaging. Format with markdown if helpful.`

    const stream = await groq.chat.completions.create({
      model: MODEL,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please explain this simply: \n\n${concept}` }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      }
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error('ELI5 API error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
