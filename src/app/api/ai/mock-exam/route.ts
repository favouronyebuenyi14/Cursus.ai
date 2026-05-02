import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq, MODEL } from '@/lib/anthropic'
import { getGlobalContext } from '@/lib/ai-context'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { topic, type } = await req.json()
    if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

    const systemPrompt = `You are an expert academic examiner. 
    The student wants a mock exam on the topic: "${topic}".
    The exam format is: ${type === 'mcq' ? 'Multiple Choice Questions (MCQ)' : 'Theory/Essay Questions'}.
    
    Generate exactly 5 high-quality, challenging questions.
    
    If format is MCQ:
    - Each question MUST have exactly 4 options.
    - Indicate the correct answer.
    - Provide a detailed explanation for why the answer is correct.
    
    If format is Theory:
    - Provide the question.
    - Provide an "exemplar" correct answer for later grading comparison.
    - Provide an explanation of what key points should be included.
    
    You MUST return ONLY a raw JSON object with a "questions" array.
    Example format:
    {
      "questions": [
        {
          "id": "1",
          "question": "What is...",
          "options": ["A", "B", "C", "D"], // Only for MCQ
          "correctAnswer": "A",
          "explanation": "Because..."
        }
      ]
    }`

    const libraryContext = await getGlobalContext(topic)

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${libraryContext}\n\nGenerate the mock exam questions for: ${topic}` }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    })

    const resultText = completion.choices[0]?.message?.content || '{"questions":[]}'
    
    try {
      const data = JSON.parse(resultText)
      return NextResponse.json(data)
    } catch (e) {
      console.error('Failed to parse exam JSON:', resultText)
      return NextResponse.json({ error: 'Failed to generate valid exam questions' }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Mock Exam API error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
