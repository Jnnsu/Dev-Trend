import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'

export function parseJSONArray(text: string): unknown[] {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const m = clean.match(/\[[\s\S]*\]/)
  if (!m) throw new Error('JSON 배열 없음. 응답: ' + text.slice(0, 200))
  return JSON.parse(m[0])
}

interface GeminiOptions {
  maxTokens?: number
  useSearch?: boolean
}

export async function geminiJSON(
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {}
): Promise<string> {
  const { useSearch = false } = options

  const tools = useSearch
    ? [{ googleSearch: {} }]
    : undefined

  const model = genAI.getGenerativeModel({
    model: MODEL,
    // @ts-expect-error googleSearch tool type
    tools,
    systemInstruction: systemPrompt,
  })

  const result = await model.generateContent(userPrompt)
  return result.response.text()
}
