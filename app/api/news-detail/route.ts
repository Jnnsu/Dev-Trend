import { NextRequest, NextResponse } from 'next/server'
import { extract } from '@extractus/article-extractor'

import { geminiJSON } from '@/lib/gemini'
import { getCached, setCached } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const title = searchParams.get('title') || ''
  const url = searchParams.get('url') || ''

  const cacheKey = `news-detail:${encodeURIComponent(url || title)}`

  const cached = await getCached<{ detail: string }>(cacheKey)

  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    let articleText = ''

    if (url) {
      try {
        const article = await extract(url)

        articleText =
          article?.content ||
          article?.description ||
          ''
      } catch (e) {
        console.error('Article extract error:', e)
      }
    }

    const trimmedArticle = articleText
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000)

    const prompt = `
다음 기술 뉴스를 한국어로 분석해줘.

제목:
${title}

${trimmedArticle
  ? `기사 내용:
${trimmedArticle}`
  : ''}

아래 형식으로 설명해줘.

- 어떤 업데이트/발표인지
- 무엇이 달라졌는지
- 어떤 기술이 관련됐는지

- 개발자 입장에서 의미
- 업계 영향
- 실무 영향

조건:
- 너무 과장하지 말 것
- 마크다운 사용 금지
- 6~8문장 정도
- 읽기 쉽게 자연스럽게
`

    const detail = await geminiJSON(
      '너는 기술 뉴스 분석 전문가다. 순수 텍스트만 출력해.',
      prompt,
      {
        useSearch: false,
      }
    )

    const result = {
      detail: detail.trim(),
    }

    await setCached(
      cacheKey,
      result,
      60 * 24
    )

    return NextResponse.json(result)
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