import { NextRequest, NextResponse } from 'next/server'
import Parser from 'rss-parser'

import { geminiJSON, parseJSONArray } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'

const parser = new Parser()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 10
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `geek-news:${page}`
  const cached = await getCached(cacheKey)

  if (cached) {
    return NextResponse.json({
      items: cached,
      hasMore: true,
      cached: true,
    })
  }

  try {
    const feed = await parser.parseURL(
      'https://feeds.feedburner.com/geeknews-feed'
    )

    const total = feed.items.length

    const rawItems = feed.items.slice(start, end)

    const simplified = rawItems.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      contentSnippet: item.contentSnippet,
    }))

    const withDate = simplified.map((item) => ({
      ...item,
      date: item.pubDate
        ? new Date(item.pubDate).toISOString().split('T')[0]
        : today
    }))

    const aiText = await geminiJSON(
      `
너는 한국 개발자를 위한 기술 뉴스 큐레이터다.

반드시 JSON 배열만 반환해.
설명 금지.
마크다운 금지.
코드블럭 금지.
`,
      `
다음 GeekNews 기사들을 한국어로 정리해줘.

${JSON.stringify(withDate)}

반드시 아래 형식으로 반환:

[
  {
    "title": "원문 제목",
    "titleKo": "한국어 제목",
    "category": "프론트엔드|백엔드|AI/ML|DevOps|모바일",
    "date": "YYYY-MM-DD",
    "summary": "영문 요약",
    "summaryKo": "한국어 요약",
    "url": "실제 URL",
    "tags": ["tag1", "tag2"]
  }
]

규칙:
- titleKo는 한국 IT 뉴스 헤드라인 느낌으로 자연스럽게 번역
- 영어 단어를 억지로 직역하지 말 것
- summaryKo는 2문장 이하
- tags 최대 3개
- date는 입력값 그대로 사용 (절대 생성 금지)
`,
      {
        useSearch: false,
      }
    )

    const items = parseJSONArray(aiText)

    const safeItems = items.map((item: any, i: number) => ({
      ...item,
      date: withDate[i]?.date || today
    }))

    await setCached(
      cacheKey,
      safeItems,
      60 * 30
    )

    return NextResponse.json({
      items: safeItems,
      hasMore: end < total,
    })
  } catch (e) {
    console.error(e)

    return NextResponse.json(
      {
        error: String(e),
      },
      {
        status: 500,
      }
    )
  }
}