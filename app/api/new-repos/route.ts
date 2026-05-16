import { NextRequest, NextResponse } from 'next/server'
import { geminiJSON, parseJSONArray } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 10
  const offset = (page - 1) * pageSize
  const cacheKey = `new-repos:${page}`

  const cached = await getCached<unknown[]>(cacheKey)
  if (cached) return NextResponse.json({ items: cached, hasMore: cached.length >= pageSize, cached: true })

  const rankStr = offset === 0 ? 'TOP 10' : `${offset + 1}위~${offset + pageSize}위`

  try {
    const text = await geminiJSON(
      'You are a GitHub trends expert. Respond ONLY with a valid JSON array. No markdown code blocks. Start with [ end with ].',
      `최근 30일 이내 생성된 GitHub 저장소 중 스타 급상승 ${rankStr}. 중복 없이.\n\n[{"rank":${offset + 1},"owner":"o","name":"n","url":"https://github.com/o/n","language":null,"stars":"1.2k","createdAt":"2026-04-20","description":"eng desc","summary":"한국어 40자 이내","tags":["tag"]}]`
    )
    const items = parseJSONArray(text)
    await setCached(cacheKey, items, 120)
    return NextResponse.json({ items, hasMore: items.length >= pageSize })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
