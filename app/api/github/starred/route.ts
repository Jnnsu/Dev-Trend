import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.provider_token) {
    return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const perPage = 30

  const res = await fetch(
    `https://api.github.com/user/starred?sort=updated&per_page=${perPage}&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  )

  if (!res.ok) return NextResponse.json({ error: `GitHub API 오류: ${res.status}` }, { status: res.status })
  const data = await res.json()
  return NextResponse.json({ items: data, hasMore: data.length >= perPage })
}
