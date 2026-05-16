import { NextRequest, NextResponse } from 'next/server'

import { geminiJSON, parseJSONArray } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'

interface HNItem {
  id: number
  title: string
  url?: string
  score?: number
  by?: string
  time?: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = 10
    const offset = (page - 1) * pageSize
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `community:${page}`
    const cached = await getCached(cacheKey)

    if (cached) {
      return NextResponse.json({
        items: cached,
        hasMore: true,
        cached: true,
      })
    }

    // HackerNews Best Stories
    const topRes = await fetch(
      'https://hacker-news.firebaseio.com/v0/beststories.json',
      {
        next: {
          revalidate: 600,
        },
      }
    )

    if (!topRes.ok) {
      throw new Error('HackerNews beststories fetch 실패')
    }

    const ids: number[] = await topRes.json()

    const selectedIds = ids.slice(offset, offset + pageSize)

    const rawItems: HNItem[] = await Promise.all(
      selectedIds.map(async (id) => {
        try {
          const res = await fetch(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
            {
              next: {
                revalidate: 600,
              },
            }
          )

          if (!res.ok) return null

          return await res.json()
        } catch {
          return null
        }
      })
    ).then(items =>
      items.filter(Boolean) as HNItem[]
    )

    const filtered = rawItems.filter(
      item => item && item.title && item.url
    )

    if (!filtered.length) {
      return NextResponse.json({
        items: [],
        hasMore: false,
      })
    }

    const normalized = filtered.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
      time: item.time,
      date: item.time
        ? new Date(item.time * 1000).toISOString().split('T')[0]
        : today,
    }))

    const aiText = await geminiJSON(
      `
너는 한국 개발자를 위한 커뮤니티 인기글 큐레이터다.

반드시 JSON 배열만 반환해.
설명 금지.
마크다운 금지.
코드블럭 금지.
`,
      `
다음 Hacker News 인기글들을 한국 개발자 스타일로 정리해줘.

${JSON.stringify(normalized)}

반드시 아래 형식만 반환:

[
  {
    "title": "원문 제목",
    "titleKo": "자연스러운 한국어 제목",
    "category": "프론트엔드|백엔드|AI/ML|DevOps|모바일",
    "date": "YYYY-MM-DD",
    "summary": "영문 짧은 요약",
    "summaryKo": "한국어 짧은 요약",
    "url": "실제 URL",
    "tags": ["tag1", "tag2"]
  }
]

규칙:
- date는 입력값 그대로 사용 (절대 생성 금지)
- summaryKo는 2문장 이하
- tags 최대 3개
- category 반드시 하나
`,
      {
        useSearch: false,
      }
    )

    const items = parseJSONArray(aiText)
    const safeItems = items.map((item: any, i: number) => {
      const base = normalized[i]

      return {
        ...item,

        date: base?.date || today,
        url: base?.url,
        title: base?.title,
        id: base?.id,
      }
    })

    await setCached(
      cacheKey,
      safeItems,
      60 * 10
    )

    return NextResponse.json({
      items: safeItems,
      hasMore: ids.length > offset + pageSize,
    })
  } catch (e) {
    console.error(e)

    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'unknown error',
      },
      {
        status: 500,
      }
    )
  }
}