import { NextRequest, NextResponse } from 'next/server'
import { geminiJSON } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || ''
  const url = searchParams.get('url') || ''
  const cacheKey = `news-detail:${title}`

  const cached = await getCached<{detail: string}>(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    const detail = await geminiJSON(
      '기술 뉴스 분석 전문가야. 마크다운 없이 순수 텍스트로만 응답해.',
      `다음 기술 뉴스에 대해 한국어로 상세히 설명해줘.
제목: "${title}"
${url ? `URL: ${url}` : ''}

- 이 뉴스/업데이트가 어떤내용인지 상세히 6~10문장으로 설명해줘
- 이 뉴스가 왜 중요한지, 기술적으로 어떤 의미가 있는지 6~10문장으로 설명해줘`,
      { useSearch: !!url }
    )
    const result = { detail: detail.trim() }
    await setCached(cacheKey, result, 60 * 24)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}