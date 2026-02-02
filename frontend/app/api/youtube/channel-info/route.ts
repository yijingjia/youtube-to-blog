import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const channelId = searchParams.get('channelId')

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId is required' },
        { status: 400 }
      )
    }

    let response

    // If it's a handle (@username), use the forHandle parameter
    if (channelId.startsWith('@')) {
      response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        forHandle: channelId,
      })
    } else {
      // Direct channel ID lookup
      response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId],
      })
    }

    const channel = response.data.items?.[0]
    if (!channel) {
      console.error('No channel found for:', channelId)
      console.error('API Response:', JSON.stringify(response.data, null, 2))
      return NextResponse.json(
        { error: `Channel not found: ${channelId}` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      channel: {
        channel_id: channel.id,
        channel_name: channel.snippet?.title,
        channel_handle: channelId.startsWith('@') ? channelId : channel.snippet?.customUrl,
        description: channel.snippet?.description,
        thumbnail_url: channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.default?.url,
        subscriber_count: parseInt(channel.statistics?.subscriberCount || '0'),
        video_count: parseInt(channel.statistics?.videoCount || '0'),
      },
    })
  } catch (error: unknown) {
    console.error('YouTube API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch channel info: ${errorMessage}` },
      { status: 500 }
    )
  }
}
