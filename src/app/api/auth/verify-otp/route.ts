import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { method, value, code, role } = await req.json()

    if (!method || !value || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Look up OTP
    const { data: otpRecord, error: lookupError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('identifier', value)
      .eq('otp_code', code)
      .single()

    if (lookupError || !otpRecord) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
    }

    // Delete used OTP
    await supabase.from('otp_verifications').delete().eq('identifier', value)

    // Create or get Supabase auth user
    let userId: string

    if (method === 'email') {
      // Try to get existing user
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existing = existingUsers?.users?.find(u => u.email === value)

      if (existing) {
        userId = existing.id
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: value,
          email_confirm: true,
          user_metadata: { role: role || 'university_student' }
        })
        if (createError || !newUser.user) {
          return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
        }
        userId = newUser.user.id
      }
    } else {
      // Phone
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existing = existingUsers?.users?.find(u => u.phone === value)

      if (existing) {
        userId = existing.id
      } else {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          phone: value,
          phone_confirm: true,
          user_metadata: { role: role || 'university_student' }
        })
        if (createError || !newUser.user) {
          return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
        }
        userId = newUser.user.id
      }
    }

    // Check if profile exists (determines if onboarding needed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    // Create a session for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: method === 'email' ? value : `${userId}@cursus.app`,
    })

    // For the response, include session info
    // The client will need to handle session creation
    return NextResponse.json({
      success: true,
      userId,
      needsOnboarding: !profile,
      // In production, you'd set a proper session cookie here
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
