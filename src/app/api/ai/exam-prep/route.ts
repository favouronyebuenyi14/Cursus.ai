import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateOTP, getOTPExpiry } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { method, value } = await req.json()

    if (!value) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    if (method !== 'email') return NextResponse.json({ error: 'Only email auth is supported' }, { status: 400 })

    const supabase = createAdminClient()
    const otp = generateOTP()
    const expiry = getOTPExpiry()

    // Store OTP
    const { error: dbError } = await supabase.from('otp_verifications').upsert({
      identifier: value,
      method: 'email',
      otp_code: otp,
      expires_at: expiry.toISOString(),
    }, { onConflict: 'identifier' })

    if (dbError) {
      console.error('OTP DB error:', dbError)
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
    }

    // Send via Supabase Auth email
    // Supabase will send the email — the OTP is stored in our DB for verification
    // In dev: check the otp_verifications table directly for the code
    // In prod: wire up a custom email template via Supabase → Authentication → Email Templates

    // For a cleaner dev experience, log it
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🔑 OTP for ${value}: ${otp}\n`)
    }

    // Optional: send a custom email via Resend (free tier — resend.com)
    // Uncomment and fill in if you want branded emails:
    //
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'Cursus <noreply@yourdomain.com>',
    //     to: value,
    //     subject: 'Your Cursus verification code',
    //     html: `
    //       <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
    //         <h2 style="color:#00D4AA">Cursus</h2>
    //         <p>Your verification code is:</p>
    //         <h1 style="letter-spacing:8px;color:#0A0F1C;background:#00D4AA;padding:16px;text-align:center;border-radius:8px">${otp}</h1>
    //         <p style="color:#666">Valid for 15 minutes. Do not share this code.</p>
    //       </div>
    //     `,
    //   }),
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
