import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq, MODEL } from '@/lib/anthropic'
import { getGlobalContext } from '@/lib/ai-context'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { topic } = await req.json()
    if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

    const systemPrompt = `You are an expert exam prep assistant. 
    The user wants to study: "${topic}".
    Generate exactly 5 to 10 high-quality flashcards based on this topic.
    Extract key definitions, formulas, or core concepts.
    
    You MUST return ONLY a raw JSON object with a "cards" array. Do NOT wrap it in markdown block quotes.
    Format exactly like this:
    {
      "cards": [
        {
          "question": "What is the powerhouse of the cell?",
          "answer": "The mitochondria."
        }
      ]
    }`

    const libraryContext = await getGlobalContext(topic)

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${libraryContext}\n\nGenerate flashcards for the topic: ${topic}` }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const resultText = completion.choices[0]?.message?.content || '{"cards":[]}'
    
    try {
      const data = JSON.parse(resultText)
      return NextResponse.json(data)
    } catch (e) {
      console.error('Failed to parse flashcards JSON:', resultText)
      return NextResponse.json({ error: 'Failed to generate valid flashcards' }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Flashcards API error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
