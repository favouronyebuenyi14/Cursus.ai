import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq, MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { prompt, type } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })

    let systemPrompt = ''
    if (type === 'imrad') {
      systemPrompt = `You are a research assistant. The user wants an IMRaD outline for: "${prompt}". 
      Return ONLY a raw JSON array of strings for the headings. 
      Example format: ["Introduction", "Methodology", "Results", "Discussion", "Conclusion"]. 
      Tailor the headings slightly to the prompt if applicable, but strictly follow IMRaD structure. 
      Do NOT wrap in markdown \`\`\`json. Return JUST the array.`
    } else {
      systemPrompt = `You are a research assistant. The user wants a smart outline for: "${prompt}". 
      Return ONLY a raw JSON array of strings representing the main section headings. 
      Keep it between 4 to 6 headings.
      Example format: ["Background", "Core Concepts", "Analysis", "Future Implications"]. 
      Do NOT wrap in markdown \`\`\`json. Return JUST the array.`
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })

    const resultText = completion.choices[0]?.message?.content || '[]'
    
    try {
      // Strip markdown code blocks if Groq adds them despite instructions
      const cleanJson = resultText.replace(/```json\n?|\n?```/g, '').trim()
      const headings = JSON.parse(cleanJson)
      
      if (Array.isArray(headings)) {
        return NextResponse.json({ headings })
      }
    } catch (e) {
      console.error('Failed to parse outline JSON:', resultText)
    }

    // Fallback if parsing fails
    return NextResponse.json({ headings: ['Introduction', 'Body', 'Conclusion'] })

  } catch (error: any) {
    console.error('Outline generation error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
