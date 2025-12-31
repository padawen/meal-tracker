/*
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
    try {
        // Create Supabase client with service role key
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

        // Get current date items in Hungary timezone
        const now = new Date();
        const budapestTime = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Budapest',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(now);

        const year = parseInt(budapestTime.find(p => p.type === 'year')?.value || '0');
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Budapest' });
        
        // Use APP_URL from secrets, fallback to localhost for now
        const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:3000' 

        console.log(`Checking meal record for date: ${todayStr} (Year: ${year})`)

        // Restored year check for 2026
        if (year < 2026) {
            console.log('Not yet 2026, skipping reminders.')
            return new Response(
                JSON.stringify({ message: 'Skipping: Reminder system starts in 2026' }),
                { headers: { 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // Get all approved users
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('is_approved', true)

        if (usersError) {
            console.error('Error fetching users:', usersError)
            throw usersError
        }

        if (!users || users.length === 0) {
            console.log('No approved users found to notify.')
            return new Response(
                JSON.stringify({ message: 'No approved users found' }),
                { headers: { 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        console.log(`Found ${users.length} approved users`)

        // Check if today's meal record exists
        const { data: todayRecords, error: recordsError } = await supabase
            .from('meal_records')
            .select('id')
            .eq('date', todayStr)

        if (recordsError) {
            console.error('Error fetching meal records:', recordsError)
            throw recordsError
        }

        // If there's already a record for today, don't send emails
        if (todayRecords && todayRecords.length > 0) {
            console.log('Meal already recorded for today, skipping reminder.')
            return new Response(
                JSON.stringify({ message: 'Meal already recorded for today' }),
                { headers: { 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        console.log('Sending reminder emails to all approved users...')

        // Send emails to all approved users
        const emailPromises = users.map(async (user) => {
            console.log(`Sending email to: ${user.email}`)
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`
                    },
                    body: JSON.stringify({
                        from: 'onboarding@resend.dev',
                        to: [user.email],
                        subject: 'Emlékeztető: Mai étkezés rögzítése',
                        html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                  <h2 style="color: #4f46e5;">Szia ${user.full_name || 'Kolléga'}!</h2>
                  <p style="font-size: 16px; color: #374151; line-height: 1.5;">Még nem rögzítetted a mai (<strong>${todayStr}</strong>) étkezést a személyzeti rendszerben.</p>
                  <div style="margin: 30px 0;">
                    <a href="${APP_URL}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Rögzítés most</a>
                  </div>
                  <p style="font-size: 14px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    Üdvözlettel,<br>
                    <strong>Személyzeti Rendszer</strong>
                  </p>
                </div>
              `
                    })
                })
                const resData = await response.json()
                return { email: user.email, status: 'success', data: resData }
            } catch (err) {
                console.error(`Failed to send email to ${user.email}:`, err)
                return { email: user.email, status: 'error', error: err.message }
            }
        })

        const results = await Promise.all(emailPromises)

        return new Response(
            JSON.stringify({
                message: `Processed ${results.length} reminder attempts`,
                results
            }),
            { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Function error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
*/

export { }
