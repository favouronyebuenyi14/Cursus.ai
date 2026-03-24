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

    const { action, materials, courseName, examDate } = await req.json()

    if (!profile?.is_pro && action !== 'concentration_areas') {
      return NextResponse.json({ error: 'Reading plans and study notes require Pro.' }, { status: 403 })
    }

    if (!profile?.is_pro) {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
      const { count } = await supabase.from('exam_preps')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString())
      if ((count || 0) >= 1) {
        return NextResponse.json({ error: 'Weekly limit reached. Upgrade to Pro for unlimited exam prep.' }, { status: 403 })
      }
    }

    let prompt: string
    if (action === 'concentration_areas') {
      prompt = `Based on these exam materials for ${courseName || 'this course'}:\n\n${materials}\n\nIdentify and rank the top 8-10 most important topics likely to appear in the exam. For each area, briefly explain why it's important and what to focus on.`
    } else if (action === 'reading_plan') {
      const daysLeft = examDate
        ? Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
        : 7
      prompt = `Create a detailed ${daysLeft}-day reading plan for ${courseName || 'this exam'} based on these materials:\n\n${materials}\n\nOrganise by day with specific topics, time allocations, and what to focus on each day. Make it realistic and achievable.`
    } else {
      prompt = `Generate comprehensive study notes for ${courseName || 'this course'} based on these materials:\n\n${materials}\n\nOrganise by topic with clear headings, key definitions, important concepts, and examples. Make it study-ready.`
    }

    const model = genAI.getGenerativeModel({ model: MODEL })
    const result = await model.generateContentStream(
      `${SYSTEM_PROMPTS.examPrep}\n\n${prompt}`
    )

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
    console.error('Exam prep error:', error)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
