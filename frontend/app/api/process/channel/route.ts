import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channel_id } = body

    if (!channel_id) {
      return NextResponse.json(
        { error: 'channel_id is required' },
        { status: 400 }
      )
    }

    console.log('🎬 Starting channel processing:', channel_id)

    // Backend directory relative to frontend
    // Use environment variable if set, otherwise resolve relative to project root
    const backendDir = process.env.BACKEND_DIR || path.resolve(process.cwd(), '..', 'backend')

    // Use spawn for real-time output
    const pythonProcess = spawn('uv', ['run', 'python', 'src/process_channel.py', channel_id], {
      cwd: backendDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    // Collect output
    let stdout = ''
    let stderr = ''

    pythonProcess.stdout?.on('data', (data) => {
      const text = data.toString()
      stdout += text
      // Real-time log to console (preserving colors from loguru)
      console.log(text.replace(/\x1b\[[0-9;]*m/g, ''))  // Strip ANSI codes for clean logs
    })

    pythonProcess.stderr?.on('data', (data) => {
      const text = data.toString()
      stderr += text
      // Real-time error log
      console.error(text.replace(/\x1b\[[0-9;]*m/g, ''))
    })

    // Wait for process to complete
    await new Promise<void>((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Channel processing completed')
          resolve()
        } else {
          reject(new Error(`Process exited with code ${code}`))
        }
      })

      pythonProcess.on('error', (error) => {
        console.error('💥 Process error:', error)
        reject(error)
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Channel processing completed',
      output: stdout,
    })
  } catch (error: unknown) {
    console.error('💥 Processing failed:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorDetails = error instanceof Error ? {
      message: error.message,
      code: (error as NodeJS.ErrnoException).code,
      killed: (error as { killed?: boolean }).killed,
      signal: (error as { signal?: string }).signal,
    } : { message: errorMessage }
    
    console.error('Error details:', errorDetails)

    return NextResponse.json(
      {
        error: 'Failed to process channel',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
