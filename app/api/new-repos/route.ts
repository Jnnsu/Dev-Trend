import { NextRequest, NextResponse } from 'next/server'
import { geminiJSON, parseJSONArray } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'

function getStartDate(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 10
  const offset = (page - 1) * pageSize
  const cacheKey = `trending:30days:${page}`
  
  const cached = await getCached<unknown[]>(cacheKey)
  if (cached) {
    return NextResponse.json({ 
      items: cached, 
      hasMore: true, 
      cached: true 
    })
  }

  try {
    const startDate = getStartDate()
    const githubUrl = `https://api.github.com/search/repositories?q=created:>${startDate}&sort=stars&order=desc&per_page=100`
    
    const res = await fetch(githubUrl, {
      headers: {
        'User-Agent': 'NextJS-Trending-App',
      },
      next: { revalidate: 300 } 
    })

    if (!res.ok) throw new Error(`GitHub API responded with status ${res.status}`)
    const data = await res.json()
    
    const total = data.items?.length || 0
    const rawItems = (data.items || []).slice(offset, offset + pageSize)

    if (rawItems.length === 0) {
      return NextResponse.json({ items: [], hasMore: false })
    }

    const simplified = rawItems.map((item: any, index: number) => ({
      rank: offset + index + 1,
      owner: item.owner.login,
      name: item.name,
      url: item.html_url,
      language: item.language,
      stars: item.stargazers_count >= 1000 
        ? `${(item.stargazers_count / 1000).toFixed(1)}k` 
        : String(item.stargazers_count),
      forks: item.forks_count,
      description: item.description || ''
    }))

    const text = await geminiJSON(
      `
너는 GitHub 트렌드 전문 큐레이터다.
반드시 제공된 데이터의 순서와 형식을 유지하여 JSON 배열만 반환해.
설명 금지. 마크다운 코드블럭 금지.
`,
      `
다음 GitHub 인기 저장소 데이터의 영문 description을 바탕으로 한국어 요약(summary)과 태그(tags)를 추가해줘.

${JSON.stringify(simplified)}

반드시 아래 배열 형식으로만 반환해야 해:
[
  {
    "rank": 기존 rank 유지,
    "owner": "기존 owner 유지",
    "name": "기존 name 유지",
    "url": "기존 url 유지",
    "language": "기존 language 유지",
    "stars": "기존 stars 유지",
    "forks": 기존 forks 유지,
    "description": "기존 description 유지",
    "summary": "핵심 기능을 설명하는 한국어 40자 이내의 명료한 요약",
    "tags": ["기술스택이나 특징 관련 태그 최대 3개"]
  }
]
`
    )

    const aiItems = parseJSONArray(text)
    const safeItems = aiItems.map((item: any, i: number) => ({
      ...simplified[i],
      summary: item?.summary || simplified[i].description.substring(0, 40),
      tags: item?.tags || [simplified[i].language].filter(Boolean)
    }))

    await setCached(cacheKey, safeItems, 60 * 10) 

    return NextResponse.json({ 
      items: safeItems, 
      hasMore: offset + pageSize < total 
    })

  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}