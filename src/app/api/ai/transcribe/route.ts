import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq } from '@/lib/anthropic'
import { FREE_LIMITS } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const audioFile = formData.get('file') as File | null
    const durationStr = formData.get('duration_seconds') as string | null

    if (!audioFile || !durationStr) {
      return NextResponse.json({ error: 'Missing file or duration' }, { status: 400 })
    }

    const durationSeconds = parseInt(durationStr, 10)

    const { data: profile } = await supabase
      .from('profiles').select('is_pro').eq('user_id', user.id).single()

    if (!profile?.is_pro) {
      // Check total recording minutes in the current month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const { data: recordings } = await supabase
        .from('recordings')
        .select('duration_seconds')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())

      const totalSecondsUsed = (recordings || []).reduce((acc, rec) => acc + (rec.duration_seconds || 0), 0)
      const allowedSeconds = FREE_LIMITS.recordingMinutesPerMonth * 60
      
      if (totalSecondsUsed + durationSeconds > allowedSeconds) {
        return NextResponse.json(
          { error: `Limit reached. Free users are limited to ${FREE_LIMITS.recordingMinutesPerMonth / 60} hours of recording per month. Upgrade to Pro for unlimited.` },
          { status: 403 }
        )
      }
    }

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'text',
    })

    const finalTranscript = typeof transcription === 'string' 
      ? transcription 
      : (transcription as any).text || ''

    await supabase.from('recordings').insert({
      user_id: user.id,
      title: 'Smart Note Recording',
      audio_url: 'transient_audio',
      transcript: finalTranscript,
      duration_seconds: durationSeconds,
    })

    return NextResponse.json({ transcript: finalTranscript })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 })
  }
}
