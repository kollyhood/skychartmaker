import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * POST /api/stages
 * Body: { label, matrix: House[], backdrop: dataURL, width, height, sourceName, sourceWidth, sourceHeight }
 * Persists a published stage to the database and returns the created row.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      label,
      matrix,
      backdrop,
      width = 1920,
      height = 1080,
      sourceName = null,
      sourceWidth = null,
      sourceHeight = null,
    } = body ?? {}

    if (!label || !Array.isArray(matrix) || typeof backdrop !== 'string') {
      return NextResponse.json(
        { error: 'Missing required fields: label, matrix[], backdrop' },
        { status: 400 },
      )
    }

    const stage = await db.stage.create({
      data: {
        label,
        matrix: JSON.stringify(matrix),
        backdrop,
        width,
        height,
        sourceName,
        sourceWidth,
        sourceHeight,
      },
    })

    return NextResponse.json({
      id: stage.id,
      label: stage.label,
      createdAt: stage.createdAt,
      width: stage.width,
      height: stage.height,
    })
  } catch (err) {
    console.error('[stages POST] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/stages
 * Returns the most recently published stage, or { stage: null } if none.
 */
export async function GET() {
  try {
    const latest = await db.stage.findFirst({
      orderBy: { createdAt: 'desc' },
    })
    if (!latest) return NextResponse.json({ stage: null })

    return NextResponse.json({
      stage: {
        id: latest.id,
        label: latest.label,
        matrix: JSON.parse(latest.matrix),
        backdrop: latest.backdrop,
        width: latest.width,
        height: latest.height,
        sourceName: latest.sourceName,
        sourceWidth: latest.sourceWidth,
        sourceHeight: latest.sourceHeight,
        createdAt: latest.createdAt,
      },
    })
  } catch (err) {
    console.error('[stages GET] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
