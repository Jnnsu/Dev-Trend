import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export function parseJSONArray(text: string): unknown[] {
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) throw new Error('JSON 배열 없음')
  return JSON.parse(m[0])
}

export async function claudeJSON(
  system: string,
  user: string,
  options: { maxTokens?: number; useSearch?: boolean } = {}
): Promise<string> {
  const { maxTokens = 2000, useSearch = false } = options
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  }
  if (useSearch) {
    // @ts-expect-error web_search is a beta tool type
    params.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
  }
  const response = await client.messages.create(params)
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}
