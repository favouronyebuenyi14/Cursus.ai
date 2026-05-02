import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq, MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { questions, userAnswers, type } = await req.json()

    const systemPrompt = `You are an expert examiner grading a ${type === 'mcq' ? 'Multiple Choice' : 'Theory'} exam.
    The user has submitted their answers. 
    Evaluate each answer based on the question and correct answer provided.
    
    For MCQ: It is binary (correct or incorrect). Match strictly.
    For Theory: Evaluate if the student's answer captures the core concepts of the exemplar answer. Be fair but rigorous.
    
    Return a JSON object where the keys are the question IDs and the values are objects with "correct" (boolean) and "feedback" (string).
    
    Format:
    {
      "grades": {
        "questionId": {
          "correct": true,
          "feedback": "Great explanation of the concepts."
        }
      }
    }`

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here are the questions and user answers for grading:\n\n${JSON.stringify({ questions, userAnswers })}` }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    const resultText = completion.choices[0]?.message?.content || '{"grades":{}}'
    
    try {
      const data = JSON.parse(resultText)
      return NextResponse.json(data)
    } catch (e) {
      console.error('Failed to parse grading JSON:', resultText)
      return NextResponse.json({ error: 'Failed to grade answers' }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Grading API error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
