import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: channels, error } = await supabase
      .from('channels')
      .select('*')
      .order('channel_name')

    if (error) throw error

    return NextResponse.json({ channels })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    const body = await request.json()

    // Validate required fields
    if (!body.channel_id || !body.channel_name) {
      return NextResponse.json(
        { error: 'channel_id and channel_name are required' },
        { status: 400 }
      )
    }

    const channelData = {
      channel_id: body.channel_id,
      channel_name: body.channel_name,
      channel_handle: body.channel_handle || null,
      description: body.description || null,
      thumbnail_url: body.thumbnail_url || null,
      subscriber_count: body.subscriber_count || null,
      video_count: body.video_count || null,
      target_languages: body.target_languages || ['zh-Hans'],
      is_active: body.is_active !== undefined ? body.is_active : true,
    }

    const { data: channel, error } = await supabase
      .from('channels')
      .insert(channelData)
      .select()
      .single()

    if (error) {
      // Check for duplicate channel_id
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Channel already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
