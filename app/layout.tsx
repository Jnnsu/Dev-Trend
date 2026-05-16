import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dev Trend',
  description: '요즘 개발 트렌드가 궁금할 때, 최신 정보를 한눈에 확인하고 AI 요약으로 시간을 절약하세요.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: '#010409', color: '#e6edf3',
        fontFamily: "'Apple SD Gothic Neo', -apple-system, 'Malgun Gothic', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
