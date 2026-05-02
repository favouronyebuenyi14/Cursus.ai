import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq, VISION_MODEL, SYSTEM_PROMPTS } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('is_pro').eq('user_id', user.id).single()

    if (!profile?.is_pro) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('snap_queries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
      if ((count || 0) >= 5) {
        return NextResponse.json({ error: 'Daily limit reached. Upgrade to Pro for unlimited snaps.' }, { status: 403 })
      }
    }

    const { imageBase64, mimeType, question } = await req.json()
    if (!imageBase64 || !question) {
      return NextResponse.json({ error: 'Image and question required' }, { status: 400 })
    }

    const imageDataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`

    const stream = await groq.chat.completions.create({
      model: VISION_MODEL,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.snapAsk },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
            {
              type: 'text',
              text: question,
            },
          ],
        },
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

        // Save to DB after streaming
        supabase.from('snap_queries').insert({
          user_id: user.id,
          image_url: '',
          question,
          ai_response: fullResponse,
        }).then(() => {})
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
    console.error('Snap ask error:', error)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
