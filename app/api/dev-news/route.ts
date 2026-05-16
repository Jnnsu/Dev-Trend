import { NextRequest, NextResponse } from 'next/server'
import { geminiJSON, parseJSONArray } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 8
  const offset = (page - 1) * pageSize
  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `dev-news:${today}:${page}`

  const cached = await getCached<unknown[]>(cacheKey)
  if (cached) return NextResponse.json({ items: cached, hasMore: cached.length >= pageSize, cached: true })

  const isFirst = page === 1
  try {
    const text = await geminiJSON(
      'You are a tech news expert. Respond ONLY with a valid JSON array. No markdown code blocks. Start with [ end with ].',
      `오늘은 ${today}야. 최근 2~4주 이내 실제 주요 개발 뉴스 찾아줘.
${isFirst ? `가장 최신 ${pageSize}개` : `${offset + 1}번~${offset + pageSize}번 (앞에서 본 것 제외)`}. summaryKo는 2문장 이내.

[{"title":"영문 원제","titleKo":"한국어 제목","category":"프론트엔드|백엔드|AI/ML|DevOps|모바일","date":"YYYY-MM-DD","summary":"영문 1~2문장","summaryKo":"한국어 1~2문장","url":"실제URL또는null","tags":["tag1","tag2"]}]`,
      { useSearch: true }
    )
    const items = parseJSONArray(text)
    await setCached(cacheKey, items, 30)
    return NextResponse.json({ items, hasMore: items.length >= pageSize })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
