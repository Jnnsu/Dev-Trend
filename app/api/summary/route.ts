import { NextRequest, NextResponse } from 'next/server'
import { geminiJSON } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const owner = searchParams.get('owner') || ''
  const name = searchParams.get('name') || ''
  const desc = searchParams.get('desc') || ''
  const cacheKey = `summary:${owner}/${name}`

  const cached = await getCached<{ summary: string }>(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    const summary = await geminiJSON(
      'GitHub 저장소를 한국어로 소개하는 전문가야. 마크다운 없이 순수 텍스트 3~4문장으로만 응답해.',
      `저장소 ${owner}/${name}: "${desc}"\n핵심 기능, 어떤 개발자에게 유용한지 한국어로 설명해.`
    )
    const result = { summary: summary.trim() }
    await setCached(cacheKey, result, 60 * 24)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
