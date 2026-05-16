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
    const jsonText = await geminiJSON(
      'GitHub 저장소를 한국어로 소개하는 전문가야. 반드시 설명이나 마크다운 없이 지정된 JSON 구조로만 응답해.',
      `
저장소 ${owner}/${name}: "${desc}"
위 저장소의 핵심 기능이 무엇인지, 어떤 개발자에게 유용한지 파악해서 3~4문장 분량의 한국어 요약문을 만들어줘.

반드시 아래 형식의 JSON 객체로만 응답해:
{
  "summary": "한국어 요약 내용 여기에 작성"
}
`
    )

    const parsed = JSON.parse(jsonText)
    const result = { summary: parsed.summary?.trim() || '요약을 생성하지 못했습니다.' }
    
    await setCached(cacheKey, result, 60 * 24)
    return NextResponse.json(result)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}