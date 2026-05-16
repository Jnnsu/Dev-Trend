'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/* ── Types ──────────────────────────────────────────────────────────── */
interface Repo {
  rank?: number; owner: string; name: string; url: string
  language?: string | null; stars?: string; forks?: string | null
  todayStars?: string | null; createdAt?: string; description?: string
  summary?: string; tags?: string[]
  owner_obj?: { login: string; avatar_url: string }
  stargazers_count?: number; forks_count?: number; html_url?: string
  full_name?: string; topics?: string[]
}

interface NewsItem {
  title: string; titleKo?: string; category?: string; date?: string
  summary?: string; summaryKo?: string; url?: string | null; tags?: string[]
}

/* ── Constants ──────────────────────────────────────────────────────── */
const LANG_COLORS: Record<string, string> = {
  TypeScript:'#3178c6', JavaScript:'#f1e05a', Python:'#3572A5',
  Go:'#00ADD8', Rust:'#dea584', Java:'#b07219', Swift:'#F05138',
  Kotlin:'#7F52FF', 'C++':'#f34b7d', 'C#':'#178600',
}
const LANGUAGES = [
  {label:'전체',value:''},{label:'TypeScript',value:'TypeScript'},
  {label:'JavaScript',value:'JavaScript'},{label:'Python',value:'Python'},
  {label:'Go',value:'Go'},{label:'Rust',value:'Rust'},{label:'Java',value:'Java'},
]
const PERIODS = [
  {label:'오늘',value:'daily'},{label:'이번 주',value:'weekly'},{label:'이번 달',value:'monthly'},
]
const TABS = [
  {id:'trending',label:'🔥 요즘 트렌드'},
  {id:'new',label:'🆕 신규 인기'},
  {id:'devnews',label:'📰 개발 뉴스'},
  {id:'mylist',label:'⭐ 내 목록'},
]
const DEV_CATS = [
  {label:'전체',value:''},{label:'Frontend',value:'프론트엔드'},
  {label:'Backend',value:'백엔드'},{label:'AI/ML',value:'AI/ML'},
  {label:'DevOps',value:'DevOps'},{label:'Mobile',value:'모바일'},
]
const CAT_COLORS: Record<string, string> = {
  '프론트엔드':'#3178c6','백엔드':'#3fb950','AI/ML':'#a371f7','DevOps':'#f0883e','모바일':'#58a6ff'
}

/* ── Infinite Scroll Hook ───────────────────────────────────────────── */
function useInfiniteLoad<T>(fetcher: (page: number) => Promise<{ items: T[]; hasMore: boolean }>) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const runFetch = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return
    loadingRef.current = true
    const isFirst = pageNum === 1
    if (isFirst) setLoading(true); else setLoadingMore(true)
    setError(null)
    try {
      const res = await fetcher(pageNum)
      setItems(prev => isFirst ? res.items : [...prev, ...res.items])
      setHasMore(res.hasMore)
      setPage(pageNum)
      setInitialized(true)
    } catch (e) {
      setError(String(e))
    } finally {
      if (isFirst) setLoading(false); else setLoadingMore(false)
      loadingRef.current = false
    }
  }, [fetcher])

  const loadFirst = useCallback(() => {
    setItems([]); setPage(0); setHasMore(false); setInitialized(false)
    runFetch(1)
  }, [runFetch])

  useEffect(() => {
    if (!sentinelRef.current || !initialized || !hasMore) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingRef.current) {
        setPage(p => { runFetch(p + 1); return p })
      }
    }, { rootMargin: '300px' })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [initialized, hasMore, runFetch])

  return { items, loading, loadingMore, error, hasMore, initialized, loadFirst, sentinelRef }
}

/* ── UI Atoms ───────────────────────────────────────────────────────── */
const s = {
  card: {background:'#0d1117',border:'1px solid #21262d',borderRadius:12,overflow:'hidden' as const,transition:'border-color 0.2s,transform 0.15s'},
}

function Skeleton() {
  return (
    <div style={{...s.card,padding:'20px 24px',animation:'pulse 1.5s ease-in-out infinite'}}>
      {[55,90,70,40].map((w,i)=>(
        <div key={i} style={{height:12,width:`${w}%`,borderRadius:4,background:'#21262d',marginBottom:10}}/>
      ))}
    </div>
  )
}

function FilterBtn({active,onClick,children,color='#58a6ff'}:{active:boolean;onClick:()=>void;children:React.ReactNode;color?:string}) {
  return (
    <button onClick={onClick} style={{background:active?'#21262d':'none',border:`1px solid ${active?color:'#30363d'}`,color:active?color:'#8b949e',padding:'3px 12px',borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:active?600:400}}>
      {children}
    </button>
  )
}

function PeriodBtn({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}) {
  return (
    <button onClick={onClick} style={{background:active?'#388bfd':'none',border:`1px solid ${active?'#388bfd':'#30363d'}`,color:active?'#fff':'#8b949e',padding:'3px 14px',borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:active?700:400}}>
      {children}
    </button>
  )
}

function ErrBox({msg}:{msg:string}) {
  return <div style={{background:'#3d1a1a',border:'1px solid #da3633',borderRadius:8,padding:'12px 16px',color:'#ff7b72',fontSize:13,marginBottom:14}}>⚠️ {msg}</div>
}

function EmptyState({icon='⬡',title,sub,btnLabel,onBtn}:{icon?:string;title:string;sub?:string;btnLabel?:string;onBtn?:()=>void}) {
  return (
    <div style={{textAlign:'center',padding:'50px 20px'}}>
      <div style={{fontSize:44,marginBottom:14}}>{icon}</div>
      <p style={{color:'#c9d1d9',fontSize:14,marginBottom:6}}>{title}</p>
      {sub&&<p style={{color:'#8b949e',fontSize:12,marginBottom:24,lineHeight:1.6}}>{sub}</p>}
      {onBtn&&<button onClick={onBtn} style={{background:'#238636',border:'none',color:'#fff',padding:'9px 26px',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:700}}>{btnLabel}</button>}
    </div>
  )
}

function RefreshRow({count,onRefresh}:{count:number;onRefresh:()=>void}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
      <span style={{fontSize:12,color:'#8b949e'}}>{count}개</span>
      <button onClick={onRefresh} style={{background:'none',border:'1px solid #30363d',color:'#8b949e',padding:'4px 14px',borderRadius:6,cursor:'pointer',fontSize:12}}>🔄 Reload</button>
    </div>
  )
}

/* ── Repo Card ──────────────────────────────────────────────────────── */
function RepoCard({repo,showKo}:{repo:Repo;showKo:boolean}) {
  const [showOrig,setShowOrig] = useState(false)
  const [summary,setSummary] = useState<string|null>(null)
  const [sumOpen,setSumOpen] = useState(false)
  const [sumLoading,setSumLoading] = useState(false)
  const color = LANG_COLORS[repo.language||''] || '#8b949e'
  const desc = showKo ? (repo.summary||repo.description) : repo.description

  const loadSummary = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (summary) { setSumOpen(v=>!v); return }
    setSumLoading(true); setSumOpen(true)
    try {
      const res = await fetch(`/api/summary?owner=${repo.owner}&name=${repo.name}&desc=${encodeURIComponent(repo.description||'')}`)
      const data = await res.json()
      setSummary(data.summary || '요약 실패')
    } catch(e) { setSummary('오류: '+String(e)) }
    finally { setSumLoading(false) }
  }

  return (
    <div style={s.card}
      onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor='#388bfd';(e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)'}}
      onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor='#21262d';(e.currentTarget as HTMLDivElement).style.transform='translateY(0)'}}>
      <div style={{position:'relative',padding:'18px 22px'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color},transparent)`}}/>
        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:10,flexWrap:'wrap'}}>
          {repo.rank&&<span style={{color:'#484f58',fontSize:11,fontWeight:700,minWidth:22}}>#{repo.rank}</span>}
          <a href={repo.url||repo.html_url} target="_blank" rel="noreferrer" style={{textDecoration:'none',display:'flex',gap:5}}>
            <span style={{color:'#8b949e',fontSize:12}}>{repo.owner} /</span>
            <span style={{color:'#58a6ff',fontSize:14,fontWeight:700}}>{repo.name}</span>
          </a>
          {repo.language&&(
            <span style={{marginLeft:'auto',flexShrink:0,fontSize:11,color,border:`1px solid ${color}44`,padding:'2px 8px',borderRadius:20,background:`${color}11`}}>
              {repo.language}
            </span>
          )}
        </div>
        <p style={{color:'#e6edf3',fontSize:13.5,lineHeight:1.7,margin:'0 0 6px',letterSpacing:'-0.2px'}}>{desc||'설명 없음'}</p>
        {showKo&&repo.description&&repo.description!==repo.summary&&(
          <p onClick={()=>setShowOrig(v=>!v)} style={{color:'#8b949e',fontSize:11,cursor:'pointer',margin:'0 0 10px'}}>
            {showOrig?`🔒 ${repo.description}`:'🔍 영문 원본'}
          </p>
        )}
        <div style={{display:'flex',gap:12,fontSize:12,color:'#8b949e',flexWrap:'wrap',marginTop:8,alignItems:'center'}}>
          {(repo.stars||(repo.stargazers_count!=null&&String(repo.stargazers_count)))&&<span>⭐ {repo.stars||repo.stargazers_count?.toLocaleString()}</span>}
          {(repo.forks||(repo.forks_count!=null&&String(repo.forks_count)))&&<span>🍴 {repo.forks||repo.forks_count?.toLocaleString()}</span>}
          {repo.todayStars&&<span style={{color:'#3fb950'}}>↑ {repo.todayStars} today</span>}
          {repo.createdAt&&<span>📅 {repo.createdAt}</span>}
          {(repo.tags||repo.topics||[]).slice(0,2).map(t=>(
            <span key={t} style={{fontSize:11,color:'#388bfd',background:'#388bfd18',border:'1px solid #388bfd33',padding:'1px 8px',borderRadius:20}}>#{t}</span>
          ))}
        </div>
        <button onClick={loadSummary} style={{marginTop:12,background:'none',border:'1px solid #30363d',color:'#8b949e',padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:11}}>
          {sumLoading?'⏳ 요약 중…':sumOpen?'▲ 닫기':'✨ AI 요약'}
        </button>
      </div>
      {sumOpen&&(
        <div style={{borderTop:'1px solid #21262d',padding:'14px 22px',background:'#161b22',fontSize:13,color:'#c9d1d9',lineHeight:1.75}}>
          {sumLoading?<span style={{color:'#8b949e',animation:'pulse 1.5s ease-in-out infinite'}}>생성 중…</span>:summary}
        </div>
      )}
    </div>
  )
}

/* ── News Card ──────────────────────────────────────────────────────── */
function NewsCard({item,showKo, onClick}:{item:NewsItem;showKo:boolean; onClick?: () => void}) {
  const [showOrig,setShowOrig] = useState(false)
  const color = CAT_COLORS[item.category||'']||'#8b949e'
  return (
    <div style={{...s.card,padding:'18px 22px',position:'relative'}}
      onClick={onClick} 
      onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.borderColor='#388bfd'}
      onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.borderColor='#21262d'}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color},transparent)`}}/>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
        {item.category&&<span style={{fontSize:11,color,background:`${color}18`,border:`1px solid ${color}33`,padding:'2px 8px',borderRadius:20}}>{item.category}</span>}
        {item.date&&<span style={{fontSize:11,color:'#484f58',marginLeft:'auto'}}>{item.date}</span>}
      </div>
      <p style={{color:'#e6edf3',fontSize:14,fontWeight:600,margin:'0 0 6px',letterSpacing:'-0.3px',lineHeight:1.5}}>
        {showKo?(item.titleKo||item.title):item.title}
      </p>
      <p style={{color:'#8b949e',fontSize:13,lineHeight:1.7,margin:'0 0 10px'}}>
        {showKo?(item.summaryKo||item.summary):item.summary}
      </p>
      {showKo&&item.title&&item.title!==item.titleKo&&(
        <p onClick={()=>setShowOrig(v=>!v)} style={{color:'#484f58',fontSize:11,cursor:'pointer',marginBottom:8}}>
          {showOrig?`🔒 ${item.title}`:'🔍 영문 원본'}
        </p>
      )}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        {(item.tags||[]).slice(0,3).map(t=>(
          <span key={t} style={{fontSize:11,color:'#8b949e',background:'#21262d',padding:'1px 8px',borderRadius:20}}>#{t}</span>
        ))}
        {item.url&&<a href={item.url} target="_blank" rel="noreferrer" style={{marginLeft:'auto',fontSize:11,color:'#388bfd',textDecoration:'none'}}>원문 →</a>}
      </div>
    </div>
  )
}

/* ── Trending Tab ───────────────────────────────────────────────────── */
function TrendingTab({showKo}:{showKo:boolean}) {
  const [lang,setLang] = useState('')
  const [period,setPeriod] = useState('weekly')
  const [loadedPeriod,setLoadedPeriod] = useState<string|null>(null)

  const fetcher = useCallback(async (page: number) => {
    const res = await fetch(`/api/trending?period=${period}&page=${page}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setLoadedPeriod(period)
    return data
  }, [period])

  const {items:all,loading,loadingMore,error,hasMore,initialized,loadFirst,sentinelRef} = useInfiniteLoad<Repo>(fetcher)
  const displayed = lang ? all.filter(r=>r.language===lang) : all
  const periodChanged = initialized && loadedPeriod && loadedPeriod !== period

  return (
    <div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {PERIODS.map(p=><PeriodBtn key={p.value} active={period===p.value} onClick={()=>setPeriod(p.value)}>{p.label}</PeriodBtn>)}
        <div style={{width:1,background:'#21262d',alignSelf:'stretch'}}/>
        {LANGUAGES.map(l=><FilterBtn key={l.value} active={lang===l.value} onClick={()=>setLang(l.value)}>{l.label}</FilterBtn>)}
      </div>
      {periodChanged&&(
        <div style={{background:'#1f2937',border:'1px solid #388bfd44',borderRadius:8,padding:'8px 14px',marginBottom:12,fontSize:12,color:'#8b949e',display:'flex',alignItems:'center',gap:8}}>
          ⚡ 기간이 변경됐어요.
          <button onClick={loadFirst} style={{background:'#388bfd',border:'none',color:'#fff',padding:'2px 10px',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600}}>다시 불러오기</button>
        </div>
      )}
      {error&&<ErrBox msg={error}/>}
      {!initialized&&!loading&&<EmptyState icon="🔥" title="GitHub 트렌딩" sub="AI가 인기 저장소를 한국어로 정리해드려요" btnLabel="불러오기" onBtn={loadFirst}/>}
      {initialized&&<RefreshRow count={displayed.length} onRefresh={loadFirst}/>}
      {loading&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{[...Array(5)].map((_,i)=><Skeleton key={i}/>)}</div>}
      {!loading&&(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {displayed.map((r,i)=><RepoCard key={`${r.owner}/${r.name}-${i}`} repo={r} showKo={showKo}/>)}
          {displayed.length===0&&initialized&&<div style={{textAlign:'center',padding:32,color:'#8b949e',fontSize:13}}>이 언어의 저장소가 없어요.</div>}
        </div>
      )}
      {loadingMore&&<div style={{textAlign:'center',padding:20,color:'#8b949e',fontSize:13}}>더 불러오는 중…</div>}
      {initialized&&!loading&&hasMore&&!lang&&<div ref={sentinelRef} style={{height:20}}/>}
    </div>
  )
}

/* ── New Repos Tab ──────────────────────────────────────────────────── */
function NewTab({showKo}:{showKo:boolean}) {
  const [lang,setLang] = useState('')
  const fetcher = useCallback(async (page: number) => {
    const res = await fetch(`/api/new-repos?page=${page}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  }, [])
  const {items:all,loading,loadingMore,error,hasMore,initialized,loadFirst,sentinelRef} = useInfiniteLoad<Repo>(fetcher)
  const displayed = lang ? all.filter(r=>r.language===lang) : all

  return (
    <div>
      <p style={{color:'#8b949e',fontSize:12,marginBottom:12}}>최근 30일 이내 생성, 스타 급상승 프로젝트</p>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {LANGUAGES.map(l=><FilterBtn key={l.value} active={lang===l.value} onClick={()=>setLang(l.value)}>{l.label}</FilterBtn>)}
      </div>
      {error&&<ErrBox msg={error}/>}
      {!initialized&&!loading&&<EmptyState icon="🆕" title="신규 인기 저장소" sub="30일 이내 생성 스타 급상승" btnLabel="불러오기" onBtn={loadFirst}/>}
      {initialized&&<RefreshRow count={displayed.length} onRefresh={loadFirst}/>}
      {loading&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{[...Array(5)].map((_,i)=><Skeleton key={i}/>)}</div>}
      {!loading&&(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {displayed.map((r,i)=><RepoCard key={`${r.owner}/${r.name}-${i}`} repo={r} showKo={showKo}/>)}
        </div>
      )}
      {loadingMore&&<div style={{textAlign:'center',padding:20,color:'#8b949e',fontSize:13}}>더 불러오는 중…</div>}
      {initialized&&!loading&&hasMore&&!lang&&<div ref={sentinelRef} style={{height:20}}/>}
    </div>
  )
}

/* ── Dev News Tab ───────────────────────────────────────────────────── */
function DevNewsTab({showKo}:{showKo:boolean}) {
  const [cat,setCat] = useState('')
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const today = new Date().toISOString().split('T')[0]
  const fetcher = useCallback(async (page: number) => {
    const res = await fetch(`/api/dev-news?page=${page}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  }, [])
  const {items:all,loading,loadingMore,error,hasMore,initialized,loadFirst,sentinelRef} = useInfiniteLoad<NewsItem>(fetcher)
  const displayed = cat ? all.filter(n=>n.category===cat) : all

  return (
    <div>
      <p style={{color:'#8b949e',fontSize:12,marginBottom:12}}>{today} 기준 최신 개발 뉴스</p>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {DEV_CATS.map(c=><FilterBtn key={c.value} active={cat===c.value} onClick={()=>setCat(c.value)}>{c.label}</FilterBtn>)}
      </div>
      {error&&<ErrBox msg={error}/>}
      {!initialized&&!loading&&<EmptyState icon="📰" title="개발 트렌드" sub="오늘 기준 최신 뉴스를 가져와요" btnLabel="불러오기" onBtn={loadFirst}/>}
      {initialized&&<RefreshRow count={displayed.length} onRefresh={loadFirst}/>}
      {loading&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{[...Array(4)].map((_,i)=><Skeleton key={i}/>)}</div>}
      {!loading&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
        {displayed.map((item,i)=>(
          <NewsCard key={i} item={item} showKo={showKo} onClick={()=>setSelectedNews(item)}/>
        ))}
      </div>}
      {loadingMore&&<div style={{textAlign:'center',padding:20,color:'#8b949e',fontSize:13}}>최신 뉴스 더 검색 중…</div>}
      {initialized&&!loading&&hasMore&&!cat&&<div ref={sentinelRef} style={{height:20}}/>}

      {selectedNews&&(
        <NewsModal item={selectedNews} showKo={showKo} onClose={()=>setSelectedNews(null)}/>
      )}
    </div>
  )
}

/* ── News Modal ───────────────────────────────────────────────────── */
function NewsModal({item, showKo, onClose}: {item: NewsItem; showKo: boolean; onClose: () => void}) {
  const [detail, setDetail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const color = CAT_COLORS[item.category || ''] || '#8b949e'

  useEffect(() => {
    setLoading(true)
    fetch(`/api/news-detail?title=${encodeURIComponent(item.title)}&url=${encodeURIComponent(item.url || '')}`)
      .then(r => r.json())
      .then(d => setDetail(d.detail))
      .catch(() => setDetail('상세 내용을 불러오지 못했어요.'))
      .finally(() => setLoading(false))
  }, [item.title])

  const handleBg = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div onClick={handleBg} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#000000aa', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#0d1117', border: '1px solid #30363d',
        borderRadius: 16, width: '100%', maxWidth: 600,
        maxHeight: '85vh', overflowY: 'auto',
        position: 'relative',
      }}>
        {/* 상단 color bar */}
        <div style={{height: 3, background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: '16px 16px 0 0'}}/>

        <div style={{padding: '24px'}}>
          {/* 헤더 */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16}}>
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1}}>
              {item.category && (
                <span style={{fontSize: 11, color, background: `${color}18`, border: `1px solid ${color}33`, padding: '2px 8px', borderRadius: 20}}>
                  {item.category}
                </span>
              )}
              {item.date && <span style={{fontSize: 11, color: '#484f58'}}>{item.date}</span>}
            </div>
            <button onClick={onClose} style={{background: 'none', border: 'none', color: '#8b949e', fontSize: 20, cursor: 'pointer', padding: '0 0 0 12px', flexShrink: 0}}>✕</button>
          </div>

          {/* 제목 */}
          <h2 style={{color: '#e6edf3', fontSize: 18, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.4, letterSpacing: '-0.5px'}}>
            {showKo ? (item.titleKo || item.title) : item.title}
          </h2>
          {showKo && item.titleKo && (
            <p style={{color: '#484f58', fontSize: 12, margin: '0 0 16px'}}>{item.title}</p>
          )}

          {/* 기본 요약 */}
          <p style={{color: '#c9d1d9', fontSize: 14, lineHeight: 1.75, margin: '0 0 20px'}}>
            {showKo ? (item.summaryKo || item.summary) : item.summary}
          </p>

          <hr style={{border: 'none', borderTop: '1px solid #21262d', margin: '0 0 20px'}}/>

          {/* AI 상세 내용 */}
          <p style={{color: '#8b949e', fontSize: 11, marginBottom: 10}}>✨ AI 상세 분석</p>
          {loading
            ? <div style={{color: '#8b949e', fontSize: 13, animation: 'pulse 1.5s ease-in-out infinite'}}>분석 중…</div>
            : <p style={{color: '#e6edf3', fontSize: 13.5, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap'}}>{detail}</p>
          }

          {/* 태그 + 원문 링크 */}
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 20}}>
            {(item.tags || []).map(t => (
              <span key={t} style={{fontSize: 11, color: '#8b949e', background: '#21262d', padding: '2px 8px', borderRadius: 20}}>#{t}</span>
            ))}
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer"
                style={{marginLeft: 'auto', background: '#238636', color: '#fff', padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none'}}>
                원문 보기 →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── My List Tab ────────────────────────────────────────────────────── */
function MyListTab({user,showKo}:{user:User|null;showKo:boolean}) {
  const [mode,setMode] = useState<'starred'|'watching'>('starred')
  const [repos,setRepos] = useState<Repo[]>([])
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState<string|null>(null)
  const supabase = createClient()

  const loginWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'read:user public_repo',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const loadRepos = useCallback(async (m: 'starred'|'watching') => {
    setLoading(true); setError(null); setRepos([])
    try {
      const res = await fetch(`/api/github/${m}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRepos(data.items)
    } catch(e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [])

  if (!user) return (
    <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:12,padding:'28px 24px',textAlign:'center'}}>
      <div style={{fontSize:40,marginBottom:16}}>🔗</div>
      <p style={{color:'#e6edf3',fontSize:15,fontWeight:600,marginBottom:8}}>GitHub으로 로그인</p>
      <p style={{color:'#8b949e',fontSize:13,lineHeight:1.7,marginBottom:24}}>
        로그인하면 내 Starred · Watching 저장소를<br/>한국어로 바로 확인할 수 있어요
      </p>
      <button onClick={loginWithGitHub} style={{background:'#238636',border:'none',color:'#fff',padding:'10px 28px',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:700,display:'inline-flex',alignItems:'center',gap:8}}>
        <span>⬡</span> GitHub으로 로그인
      </button>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,padding:'10px 14px',background:'#161b22',borderRadius:8,border:'1px solid #21262d'}}>
        <span>✅</span>
        <span style={{color:'#3fb950',fontSize:13,fontWeight:600}}>@{user.user_metadata?.user_name||user.email}</span>
        <button onClick={()=>supabase.auth.signOut()} style={{marginLeft:'auto',background:'none',border:'1px solid #30363d',color:'#8b949e',padding:'3px 10px',borderRadius:6,cursor:'pointer',fontSize:11}}>로그아웃</button>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {([{id:'starred',label:'⭐ Starred'},{id:'watching',label:'👁 Watching'}] as const).map(m=>(
          <button key={m.id} onClick={()=>{setMode(m.id);loadRepos(m.id);}} style={{background:mode===m.id?'#21262d':'none',border:`1px solid ${mode===m.id?'#58a6ff':'#30363d'}`,color:mode===m.id?'#58a6ff':'#8b949e',padding:'5px 16px',borderRadius:20,cursor:'pointer',fontSize:13,fontWeight:mode===m.id?700:400}}>{m.label}</button>
        ))}
        <button onClick={()=>loadRepos(mode)} style={{marginLeft:'auto',background:'none',border:'1px solid #30363d',color:'#8b949e',padding:'4px 14px',borderRadius:6,cursor:'pointer',fontSize:12}}>🔄 다시 불러오기</button>
      </div>
      {error&&<ErrBox msg={error}/>}
      {repos.length===0&&!loading&&<EmptyState icon="⭐" title="불러오기를 눌러주세요" btnLabel="불러오기" onBtn={()=>loadRepos(mode)}/>}
      {loading&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{[...Array(5)].map((_,i)=><Skeleton key={i}/>)}</div>}
      {!loading&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
        {repos.map((repo:Repo)=>(
          <RepoCard key={repo.full_name||`${repo.owner}/${repo.name}`} showKo={showKo} repo={{
            owner: (repo as any).owner?.login || repo.owner,
            name: repo.name,
            url: (repo as any).html_url || repo.url,
            language: repo.language,
            stars: repo.stargazers_count?.toLocaleString(),
            forks: repo.forks_count?.toLocaleString(),
            description: repo.description,
            tags: (repo as any).topics?.slice(0,3)||[],
          }}/>
        ))}
      </div>}
    </div>
  )
}

/* ── App ────────────────────────────────────────────────────────────── */
export default function Home() {
  const [tab,setTab] = useState('trending')
  const [showKo,setShowKo] = useState(true)
  const [user,setUser] = useState<User|null>(null)
  const supabase = createClient()

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>setUser(data.user))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>setUser(session?.user??null))
    return ()=>subscription.unsubscribe()
  },[])

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        *{box-sizing:border-box} a{color:inherit} button{font-family:inherit;cursor:pointer}
        input::placeholder{color:#484f58}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#010409} ::-webkit-scrollbar-thumb{background:#21262d;border-radius:4px}
      `}</style>

      {/* Header */}
      <header style={{position:'sticky',top:0,zIndex:100,background:'#01040988',backdropFilter:'blur(16px)',borderBottom:'1px solid #21262d'}}>
        <div style={{maxWidth:720,margin:'0 auto',padding:'12px 16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:20}}>⬡</span>
              <span style={{fontWeight:800,fontSize:15,letterSpacing:'-0.5px'}}>GitHub 트렌드 KR</span>
            </div>
            <button onClick={()=>setShowKo(v=>!v)} style={{background:'#21262d',border:'1px solid #30363d',color:'#e6edf3',padding:'4px 14px',borderRadius:20,fontSize:12,fontWeight:600}}>
              {showKo?'🇰🇷 한국어':'🇺🇸 English'}
            </button>
          </div>
          <nav style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#21262d':'none',border:`1px solid ${tab===t.id?'#30363d':'transparent'}`,color:tab===t.id?'#e6edf3':'#8b949e',padding:'5px 14px',borderRadius:8,fontSize:13,fontWeight:tab===t.id?600:400}}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content - 탭 상태 유지 (display 토글) */}
      <main style={{maxWidth:720,margin:'0 auto',padding:'20px 16px'}}>
        <div style={{display:tab==='trending'?'block':'none'}}><TrendingTab showKo={showKo}/></div>
        <div style={{display:tab==='new'?'block':'none'}}><NewTab showKo={showKo}/></div>
        <div style={{display:tab==='devnews'?'block':'none'}}><DevNewsTab showKo={showKo}/></div>
        <div style={{display:tab==='mylist'?'block':'none'}}><MyListTab user={user} showKo={showKo}/></div>
      </main>
    </>
  )
}
