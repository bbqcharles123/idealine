import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import CanvasCard from '../components/CanvasCard'
import { generateSeedCard } from '../ai/seedCard'
import './HomePage.css'

// 기존 더미 캔버스 데이터 — Firestore에 한 번 심기 위한 임시 seed 데이터
const SEED_CANVAS = {
  title: 'AI 생활 루틴 코치 앱',
  topic: 'AI 기술 기반 혁신적인 제품 및 서비스 아이디어',
  expandCount: 1,
  transformCount: 1,
  writeCount: 1,
  cards: [
    {
      id: 'seed-1',
      type: 'seed',
      position: { x: 400, y: 100 },
      data: {
        title: 'AI 생활 루틴 코치 앱',
        description: 'AI가 사용자의 하루 일정, 위치, 생활 패턴 데이터를 분석해 개인 맞춤형 생활 루틴을 제안하는 서비스이다. 사용자의 피로도와 집중 시간대를 고려해 업무, 휴식, 운동 시간을 자동으로 추천하고 루틴을 지속적으로 최적화한다.',
        topic: 'AI 기술 기반 혁신적인 제품 및 서비스 아이디어',
      },
    },
    {
      id: 'derived-1',
      type: 'layerstack',
      position: { x: 200, y: 400 },
      data: {
        title: '근무 유형별 루틴 자동 전환',
        description: '재택·출근 등 그날의 근무 유형을 감지해 각각에 맞는 루틴으로 자동 전환되는 기능. 출근일에는 아침 준비 시간을 반영해 운동을 저녁으로 재배치하고, 재택일에는 이동 시간이 없는 만큼 오전 루틴을 더 촘촘하게 구성한다.',
        answer: '재택근무 하는 날이랑 출근하는 날 루틴이 완전히 달라요. 출근 날은 아침에 준비 시간이 필요해서 운동을 저녁으로 밀어야 하는데, 앱은 매일 같은 시간에 운동하라고 추천하거든요.',
        highlights: [{ start: 0, end: 18 }, { start: 75, end: 98 }],
        toolType: 'expand',
        tagName: '복제',
        question: '지금 하나의 루틴으로 관리하기 어렵다고 느끼는 상황이 있다면 어떤 경우인가요?',
      },
    },
    {
      id: 'derived-write-1',
      type: 'layerstack',
      position: { x: 900, y: 400 },
      data: {
        title: '이 아이디어는 기능 구성이 이미 갖춰진 상태입니다.',
        description: '무엇을 더 밀고 무엇을 덜어낼지 재조정하면, 이 앱만의 경쟁력 있는 포지션이 선명해질 수 있습니다.',
        toolType: 'write',
        writeRec: 'transform',
        writeRecReason: '변형하기는 기존 요소 중 무엇을 더 밀고 무엇을 덜어낼지 질문하는 방법론입니다.',
      },
    },
    {
      id: 'derived-2',
      type: 'layerstack',
      position: { x: 600, y: 400 },
      data: {
        title: '온디맨드 루틴 피드',
        description: '푸시 알림을 제거하고 사용자가 앱을 여는 순간 현재 시간·위치·패턴 데이터를 즉시 분석해 지금 이 순간에 맞는 루틴을 바로 제시하는 방식.',
        answer: '알림이요. 아침에 일어나자마자 루틴 알림이 오는데 그냥 무시하게 되더라고요. 차라리 알림 없이 앱을 열면 지금 상태에 맞는 루틴이 바로 보이는 게 나을 것 같아요.',
        highlights: [{ start: 0, end: 4 }, { start: 17, end: 42 }, { start: 47, end: 52 }],
        toolType: 'transform',
        tagName: '제거',
        question: '루틴 앱에서 당연하게 제공되는 알림, 일정 직접 입력, 피로도 수동 체크 중 없애도 오히려 사용 경험이 더 나아질 것 같은 요소가 있나요?',
      },
    },
  ],
  edges: [
    { id: 'e-seed1-derived1',   source: 'seed-1', target: 'derived-1' },
    { id: 'e-seed1-derived2',   source: 'seed-1', target: 'derived-2' },
    { id: 'e-seed1-write1',     source: 'seed-1', target: 'derived-write-1' },
  ],
}

function HomePage() {
  const navigate = useNavigate()

  // 입력창 텍스트 상태
  const [inputValue, setInputValue] = useState('')

  // 작업공간 전체보기/간소화 토글 상태
  const [isExpanded, setIsExpanded] = useState(false)

  // Firestore에서 실시간으로 불러온 캔버스 목록
  const [canvases, setCanvases] = useState([])

  // Firestore 로딩 상태 (첫 구독 완료 전)
  const [loading, setLoading] = useState(true)

  // 제출 중 중복 클릭 방지
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 샘플 데이터를 Firestore에 한 번 심는 임시 함수 (seed 완료 후 이 함수와 버튼 삭제 예정)
  const handleSeedData = async () => {
    try {
      const docRef = await addDoc(collection(db, 'canvases'), {
        ...SEED_CANVAS,
        createdAt: serverTimestamp(),
      })
      alert(`샘플 데이터가 추가되었습니다. (id: ${docRef.id})`)
    } catch (err) {
      console.error('샘플 데이터 추가 실패:', err)
      alert('추가 실패 — 콘솔을 확인하세요.')
    }
  }

  // Firestore canvases 컬렉션 실시간 구독
  // 컴포넌트 마운트 시 구독 시작, 언마운트 시 자동 해제
  useEffect(() => {
    const q = query(collection(db, 'canvases'), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setCanvases(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // 입력창 제출: AI로 씨드카드(아이디어 + UX 평가)를 생성한 뒤
  // 완성된 카드를 포함한 캔버스 문서를 만들고 해당 id로 이동
  const handleSubmit = async () => {
    if (!inputValue.trim() || isSubmitting) return

    const topic = inputValue.trim()
    setIsSubmitting(true)
    try {
      // 1) AI 호출: 아이디어 제목·본문 + UX 평가 데이터를 한 번에 생성
      const seed = await generateSeedCard(topic)

      // 2) 생성된 데이터로 씨드카드 노드 구성
      const seedCard = {
        id: 'seed-1',
        type: 'seed',
        position: { x: 400, y: 100 },
        data: {
          title: seed.title,
          description: seed.description,
          topic,                 // 사용자가 입력한 원문 주제 (사이드패널 '입력 주제'에 표시)
          uxData: seed.uxData,   // UX 평가 (사이드패널 'UX 평가' 탭에 표시)
        },
      }

      // 3) 완성된 씨드카드를 포함해 캔버스 문서 생성
      //    캔버스 제목은 AI가 만든 아이디어 제목, topic은 입력 원문
      const docRef = await addDoc(collection(db, 'canvases'), {
        title: seed.title,
        topic,
        createdAt: serverTimestamp(),
        expandCount: 0,
        transformCount: 0,
        writeCount: 0,
        cards: [seedCard],
        edges: [],
      })
      navigate(`/canvas/${docRef.id}`)
    } catch (err) {
      console.error('씨드카드 생성 실패:', err)
      alert('아이디어 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
      setIsSubmitting(false)
    }
  }

  // 엔터 키로도 제출
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="home-page">

      {/* 로고: absolute로 좌상단 고정 */}
      <h1 className="home-page__logo">IdeaLine</h1>

      {/* 콘텐츠 영역: flex:1로 작업공간 위 남은 공간 차지, 세로 중앙 정렬 */}
      <main className="home-page__content">

        {/* 타이틀 + 서브타이틀 */}
        <div className="home-page__hero">
          <h2 className="home-page__title">새로운 아이디어를 만들어보세요!</h2>
          <p className="home-page__subtitle">
            참여 중인 공모전 주제나 탐색하고 싶은 키워드를 자유롭게 입력하세요
          </p>
        </div>

        {/* 입력창 */}
        <div className="home-page__input-wrap">
          <input
            className="home-page__input"
            placeholder="AI 기술 기반 혁신적인 제품 및 서비스 아이디어"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          {/* 입력값 있으면 파란색, 없으면 회색 */}
          <button
            className={`home-page__input-btn${inputValue.trim() ? ' home-page__input-btn--active' : ''}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-label="아이디어 생성"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 15V5M10 5L5.5 9.5M10 5L14.5 9.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

      </main>

      {/* 작업공간 패널: absolute bottom:0, 확장 시 콘텐츠 위로 덮음 */}
      <section className={`home-page__workspace${isExpanded ? ' home-page__workspace--expanded' : ''}`}>

        {/* 섹션 헤더: 고정 */}
        <div className="home-page__workspace-header">
          <div>
            <p className="home-page__workspace-title">작업공간</p>
            <p className="home-page__workspace-meta">
              {loading ? '불러오는 중…' : `${canvases.length}개 캔버스`}
            </p>
          </div>
          <button
            className="home-page__workspace-toggle"
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded ? '간소화 ↓' : '전체보기 ↑'}
          </button>
        </div>

        {/* 카드 본문: 접힘 → 잘림, 펼침 → 내부 스크롤 */}
        <div className="home-page__workspace-body">
          {/* 임시 seed 버튼: 캔버스가 0개일 때만 표시, 샘플 데이터 추가 후 이 블록 삭제 */}
          {!loading && canvases.length === 0 && (
            <div style={{ padding: '24px' }}>
              <button
                onClick={handleSeedData}
                style={{ padding: '10px 20px', background: '#589cfe', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
              >
                샘플 데이터 추가 (테스트용)
              </button>
            </div>
          )}
          <div className="home-page__canvas-grid">
            {canvases.map((canvas) => (
              <CanvasCard key={canvas.id} {...canvas} />
            ))}
          </div>
        </div>

      </section>
    </div>
  )
}

export default HomePage
