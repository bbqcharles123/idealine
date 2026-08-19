import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp } from 'lucide-react'
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import CanvasCard from '../components/CanvasCard'
import { generateSeedCard } from '../ai/seedCard'
import './HomePage.css'

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
      // 잠금 해제를 finally가 아니라 catch에 둔 이유:
      // 성공하면 navigate로 캔버스 화면에 넘어가 이 화면 자체가 사라지므로 풀어줄 대상이 없다.
      // (다시 홈으로 들어오면 화면이 새로 만들어지면서 isSubmitting도 false부터 시작한다)
      // 실패했을 때만 홈 화면에 그대로 남으므로, 여기서 풀어야 같은 자리에서 다시 시도할 수 있다.
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
            {/* 준비 안 됨(입력 없음) → --color-unready-text, 입력 있음(active) → 흰색 */}
            <ArrowUp size={20} color={inputValue.trim() ? 'var(--color-white)' : 'var(--color-unready-text)'} />
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
