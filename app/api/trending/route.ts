import { NextRequest, NextResponse } from 'next/server'
import { geminiJSON, parseJSONArray } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'

const PERIOD_LABEL: Record<string, string> = {
  daily: '오늘', weekly: '이번 주', monthly: '이번 달'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'weekly'
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 10
  const offset = (page - 1) * pageSize
  const cacheKey = `trending:${period}:${page}`

  const cached = await getCached<unknown[]>(cacheKey)
  if (cached) return NextResponse.json({ items: cached, hasMore: cached.length >= pageSize, cached: true })

  const rankStr = offset === 0 ? 'TOP 10' : `${offset + 1}위~${offset + pageSize}위`
  const periodLabel = PERIOD_LABEL[period] || '이번 주'

  try {
    const text = await geminiJSON(
      'You are a GitHub trends expert. Respond ONLY with a valid JSON array. No markdown code blocks. Start with [ end with ].',
      `GitHub ${periodLabel} 기준 인기 저장소 ${rankStr}. 실제 저장소만, 중복 없이.\n\n[{"rank":${offset + 1},"owner":"o","name":"n","url":"https://github.com/o/n","language":null,"stars":"12.3k","forks":null,"todayStars":null,"description":"eng desc","summary":"한국어 40자 이내","tags":["tag"]}]`
    )
    const items = parseJSONArray(text)
    await setCached(cacheKey, items, 60)
    return NextResponse.json({ items, hasMore: items.length >= pageSize })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
