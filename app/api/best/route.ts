import { NextRequest, NextResponse } from 'next/server'
import { geminiJSON, parseJSONArray } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'

const PERIOD_LABEL: Record<string, string> = {
  daily: '오늘', 
  weekly: '이번 주',
}

interface GitHubTrendingItem {
  rank: number
  owner: string
  name: string
  url: string
  language: string | null
  stars: string
  forks: number | null
  todayStars: string | null
  description: string
  summary: string
  tags: string[]
}

interface AiResponseItem {
  name?: string
  summary?: string
  tags?: string[]
}

interface GitHubRawItem {
  name: string
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  description: string | null
  owner: {
    login: string
  } | null
}

function getActiveDate(period: string): string {
  const date = new Date()
  if (period === 'daily') date.setDate(date.getDate() - 3)
  else if (period === 'weekly') date.setDate(date.getDate() - 14)
  else date.setDate(date.getDate() - 14)
  
  return date.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'weekly'
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 10
  const offset = (page - 1) * pageSize
  const cacheKey = `trending:${period}:${page}`

  const cached = (await getCached(cacheKey)) as GitHubTrendingItem[] | null
  if (cached) {
    return NextResponse.json({ 
      items: cached, 
      hasMore: cached.length >= pageSize, 
      cached: true 
    })
  }

  const periodLabel = PERIOD_LABEL[period] || '이번 주'

  try {
    const activeDate = getActiveDate(period)
    const githubUrl = `https://api.github.com/search/repositories?q=pushed:>${activeDate}&sort=stars&order=desc&per_page=100`
    
    const githubRes = await fetch(githubUrl, {
      headers: {
        'User-Agent': 'NextJS-Trending-App',
      },
      next: { revalidate: 300 }
    })

    if (!githubRes.ok) {
      throw new Error(`GitHub API responded with status ${githubRes.status}`)
    }

    const githubData = await githubRes.json()
    const rawItems = (githubData.items as GitHubRawItem[] || []).slice(offset, offset + pageSize)

    if (rawItems.length === 0) {
      return NextResponse.json({ items: [], hasMore: false })
    }

    const simplified: Omit<GitHubTrendingItem, 'summary' | 'tags'>[] = rawItems.map((item, index) => ({
      rank: offset + index + 1,
      owner: item.owner?.login || 'Unknown',
      name: item.name || 'Repository',
      url: item.html_url || 'https://github.com',
      language: item.language,
      stars: item.stargazers_count >= 1000 
        ? `${(item.stargazers_count / 1000).toFixed(1)}k` 
        : String(item.stargazers_count),
      forks: item.forks_count,
      todayStars: null,
      description: item.description || ''
    }))

    const text = await geminiJSON(
      `너는 GitHub 트렌드 전문 큐레이터다. 반드시 제공된 데이터의 구조를 유지하여 JSON 배열만 반환해. 설명/마크다운 금지.`,
      `
다음 GitHub 인기 저장소 데이터의 영문 description을 바탕으로 한국어 요약(summary)과 태그(tags)를 채워줘.
순서와 기본 정보를 절대 변경하지 마라.

${JSON.stringify(simplified.map(d => ({ name: d.name, description: d.description })))}

반드시 아래 형식의 배열로 반환:
[
  {
    "name": "제공된 name 그대로",
    "summary": "핵심 기능을 설명하는 한국어 40자 이내의 명료한 요약",
    "tags": ["기술스택이나 특징 관련 태그 최대 3개"]
  }
]
`
    )

    const aiItems = parseJSONArray(text) as AiResponseItem[]

    const safeItems: GitHubTrendingItem[] = simplified.map((original) => {
      const aiMatched = (aiItems || []).find((ai) => ai.name === original.name)

      return {
        ...original,
        summary: aiMatched?.summary || original.description.substring(0, 40) || '요약본을 생성하지 못했습니다.',
        tags: aiMatched?.tags || [original.language].filter((lang): lang is string => lang !== null)
      }
    })

    await setCached(cacheKey, safeItems, 60 * 10)
    
    return NextResponse.json({ 
      items: safeItems, 
      hasMore: safeItems.length >= pageSize 
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}