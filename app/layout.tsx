import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GitHub 트렌드 KR',
  description: 'GitHub 트렌딩을 한국어로 매일 받아보세요',
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
