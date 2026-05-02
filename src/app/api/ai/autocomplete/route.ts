import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq, MODEL } from '@/lib/anthropic'
import { getGlobalContext } from '@/lib/ai-context'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Later: Add context fetching based on active PDF IDs
    const { content, title, blockContext } = await req.json()
    
    if (!blockContext) {
      return new NextResponse('Missing context', { status: 400 })
    }

    const systemPrompt = `You are a world-class AI writing assistant co-writing a document titled "${title || 'Untitled'}".
Your job is to act as an autocomplete engine. 
The user will provide the preceding context of the document.
You must generate the NEXT 1 to 2 sentences that seamlessly continue the thought.
Do NOT repeat the last sentence. 
Do NOT include greetings or meta-commentary.
Do NOT format it with markdown unless continuing a specific format.
Match the tone, which is generally academic, professional, or clear.
Limit your response to a maximum of 3 sentences.`

    const libraryContext = await getGlobalContext(title + " " + blockContext)

    const stream = await groq.chat.completions.create({
      model: MODEL,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${libraryContext}\n\nHere is what I have written so far. Continue the thought:\n\n${content}` }
      ],
      max_tokens: 150,
      temperature: 0.5
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
    console.error('Autocomplete API error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
