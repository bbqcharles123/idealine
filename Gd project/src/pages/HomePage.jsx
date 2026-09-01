import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUp, LoaderCircle } from 'lucide-react'
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import CanvasCard from '../components/CanvasCard'
import GradientBorder from '../components/GradientBorder'
import { generateSeedCard } from '../ai/seedCard'
import './HomePage.css'

// 홈 입력창 placeholder로 번갈아 보여줄 예시 6개.
// 짧은 키워드(4자)에서 형식 갖춘 공모전 주제(25자) 순으로 배치했다.
// 목적은 예시를 많이 보여주는 게 아니라 "이 폭 안이면 다 된다"를 길이 자체로
// 알려주는 것이다. 마지막(25자)에서 처음(4자)으로 되감기는 순간이 낙차가 가장 커서
// 범위가 가장 분명하게 드러난다.
// 컴포넌트 바깥에 두는 이유: 안에 두면 렌더마다 새 배열이 만들어져
// 아래 회전 타이머 useEffect가 매번 처음부터 다시 시작한다.
const PLACEHOLDER_EXAMPLES = [
  '1인 가구',
  '시니어 대중교통',
  '반려동물 돌봄',
  '대학생 자취 생활을 돕는 서비스',
  '탄소중립 실천을 유도하는 생활 밀착형 서비스',
  'AI 기술 기반 혁신적인 제품 및 서비스 아이디어',
]

// 한 예시를 보여주고 있는 시간. 가장 긴 6번(25자)을 읽는 데 걸리는 시간이 기준이다
// (한글 묵독 속도를 초당 10자 남짓으로 잡으면 25자는 2.5초).
const PLACEHOLDER_HOLD_MS = 2600

// 페이드 한 번의 길이. HomePage.css의 home-ph-in / home-ph-out 애니메이션 길이(0.32s)와
// 반드시 같아야 한다 — 한쪽만 고치면 글자가 사라진 뒤 빈 칸이 잠깐 보이거나,
// 이전 글자가 덜 사라진 채로 다음 글자가 겹친다.
const PLACEHOLDER_FADE_MS = 320

// 직전 방문에 캔버스가 있었는지 기억해 두는 자리(localStorage 키).
//
// Firestore 구독은 비동기라 첫 렌더 시점에는 캔버스 개수를 알 수 없다.
// 그때 canvases는 []인데, 이 []가 "0개다"인지 "아직 응답 전이다"인지 구분되지 않아
// 작업공간 패널을 그릴지 정할 근거가 없다.
// localStorage는 동기라 첫 렌더 그 자리에서 읽히므로, 직전 방문의 결과를 임시 답으로 쓴다.
//
// 어디까지나 추측값이다 — 데이터의 출처는 언제나 Firestore이고
// 수백 ms 뒤 실제값이 이 추측을 덮는다. 브라우저가 바뀌면 그 브라우저의 첫 방문
// 한 번만 빗나가고 이후로는 맞는다.
const HAS_CANVASES_KEY = 'idealine.hasCanvases'

// localStorage는 저장소 차단 설정 등에서 예외를 던질 수 있다.
// 읽기에 실패해도 화면은 그려져야 하므로 조용히 기본값(false = 패널 없음)으로 넘어간다.
function readHadCanvases() {
  try {
    return localStorage.getItem(HAS_CANVASES_KEY) === '1'
  } catch {
    return false
  }
}

// 저장에 실패하면 다음 방문에서 추측이 한 번 빗나갈 뿐이므로 무시한다.
function writeHadCanvases(has) {
  try {
    localStorage.setItem(HAS_CANVASES_KEY, has ? '1' : '0')
  } catch {
    // 무시
  }
}

function HomePage() {
  const navigate = useNavigate()

  // 입력창 텍스트 상태
  const [inputValue, setInputValue] = useState('')

  // Firestore에서 실시간으로 불러온 캔버스 목록
  const [canvases, setCanvases] = useState([])

  // Firestore 로딩 상태 (첫 구독 완료 전)
  const [loading, setLoading] = useState(true)

  // 첫 렌더용 추측값 — 직전 방문에 캔버스가 있었는지.
  // useState의 초기화 함수 자리에서 읽으므로 렌더마다 다시 읽지 않고 최초 한 번만 읽는다.
  // 이후 갱신은 아래 onSnapshot이 localStorage에 직접 쓰므로 이 값은 바뀌지 않는다.
  const [hadCanvases] = useState(readHadCanvases)

  // 제출 중 중복 클릭 방지
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 회전 placeholder — 지금 보여줄 예시의 인덱스와 "사라지는 중" 여부
  const [phIndex, setPhIndex] = useState(0)
  const [phLeaving, setPhLeaving] = useState(false)

  // 입력창 포커스 여부. 포커스 중에는 회전을 멈춘다 —
  // 깜빡이는 커서 바로 옆에서 글자가 바뀌면 산만하고,
  // 무엇보다 읽고 있던 예시가 중간에 사라진다.
  const [isFocused, setIsFocused] = useState(false)

  // 모션 축소 설정이면 회전 자체를 끈다.
  // CSS 미디어쿼리로는 페이드만 멈출 뿐 2.6초마다 글자가 바뀌는 것은 그대로여서,
  // JS에서 막아야 "움직임이 불편하다"는 설정의 뜻에 맞는다.
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  // 회전 타이머 id 보관 — 정리 함수에서 한꺼번에 지운다
  const phTimers = useRef([])

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
      // 다음 방문의 첫 렌더가 쓸 추측값을 갱신한다.
      // 캔버스를 만들거나 지울 때마다 이 콜백이 다시 실행되므로 값은 항상 최신이다.
      writeHadCanvases(data.length > 0)
    })

    return () => unsubscribe()
  }, [])

  // 모션 축소 설정 변화를 구독 — 사용자가 OS 설정을 도중에 바꿀 수 있다
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (e) => setReduceMotion(e.matches)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  // 입력값이 비어 있는지 — placeholder 표시 여부와 회전 조건 양쪽에 쓰인다
  const isInputEmpty = inputValue.trim() === ''

  // 회전 조건: 비어 있고, 포커스가 없고, 생성 중이 아니고, 모션 축소도 아닐 때만.
  // 기준은 하나다 — 사용자가 이 입력창을 쓰기 시작했는가.
  // 시작했다면 예시는 할 일을 마쳤고, 그 뒤의 움직임은 전부 방해다.
  const isRotating = isInputEmpty && !isFocused && !isSubmitting && !reduceMotion

  // 작업공간 패널을 그릴지 여부.
  // 아직 Firestore 응답 전(loading)이면 직전 방문 기억으로 추측하고,
  // 응답이 온 뒤부터는 실제 개수로 판단한다.
  //
  // 캔버스가 0개면 빈 패널을 그리지 않고 섹션 자체를 렌더하지 않는다.
  // 생성 중 dim 스크림도 그 섹션의 자식이므로 함께 사라진다 —
  // isSubmitting 쪽에 별도 조건을 두지 않는 이유다. 조건이 두 곳으로 흩어지면
  // 나중에 한쪽만 바뀐다.
  const showWorkspace = loading ? hadCanvases : canvases.length > 0

  // 회전 타이머: 유지(2600ms) → 페이드아웃(320ms) → 인덱스 교체 → 다시 유지 … 반복.
  // setInterval이 아니라 setTimeout 사슬인 이유는 두 구간의 길이가 다르기 때문이다.
  useEffect(() => {
    if (!isRotating) return

    const schedule = () => {
      phTimers.current.push(
        setTimeout(() => {
          setPhLeaving(true)
          phTimers.current.push(
            setTimeout(() => {
              setPhIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length)
              setPhLeaving(false)
              schedule()
            }, PLACEHOLDER_FADE_MS)
          )
        }, PLACEHOLDER_HOLD_MS)
      )
    }
    schedule()

    // 회전이 멈출 때와 컴포넌트가 사라질 때 모두 실행된다.
    // 이게 없으면 navigate로 캔버스 화면에 넘어간 뒤에도 타이머가 살아 있어
    // 이미 없어진 컴포넌트에 setState가 걸린다.
    return () => {
      phTimers.current.forEach(clearTimeout)
      phTimers.current = []
    }
  }, [isRotating])

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
      //    캔버스 제목은 사용자가 입력한 주제 원문을 그대로 쓴다 (AI를 거치지 않는다).
      //    - 캔버스는 '작업공간 전체'의 이름이고 씨드카드는 '그 안의 첫 아이디어 하나'라 층위가 다르다
      //    - 헤더에서 제목을 고치면 캔버스 문서의 title만 갱신되고 카드 제목과는 갈라지므로(App.jsx),
      //      처음부터 별개인 값을 AI로 맞춰줄 이유가 없다
      //    - 목록에서 작업공간을 찾는 기준은 "내가 뭐라고 입력했는가"다
      const docRef = await addDoc(collection(db, 'canvases'), {
        title: topic,
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
      // 문구는 앱의 다른 오류 네 자리와 같은 '~하지 못했어요' 틀을 쓴다.
      // 대상을 '시작 아이디어'로 좁혀 부르지 않는 이유: 홈 화면은 이것을 네 자리 모두
      // 그냥 '아이디어'라고 부르고(대제목·입력창 이름·생성 버튼·진행 안내),
      // 바로 위 진행 문구 '아이디어를 만들고 있어요'와 주어가 같아야 실패가 그 사건과 이어져 읽힌다.
      // ('씨드카드'는 코드 용어일 뿐 화면에 노출된 적이 없다)
      //
      // 표시 방식은 아직 브라우저 alert다 — 앱의 다른 오류는 전부 인앱 컴포넌트라
      // 이 자리도 인앱으로 바꿔야 하지만, 그건 문구와 별개의 UI 작업이라 함께 처리한다.
      alert('아이디어를 만들지 못했어요')
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

  // 입력값 변경. 값을 지워서 다시 비면 "보고 있던 예시 그대로" 돌아온다.
  // 포커스 중에는 회전이 멈춰 있으므로, 사용자가 타이핑을 시작하기 직전에 마지막으로
  // 본 문구가 곧 그 예시다 — 임의로 튀어나온 게 아니라 방금 본 그것이라,
  // 1번으로 되돌리는 쪽이 오히려 연결을 끊는다.
  //
  // phLeaving만 되돌리는 이유: 페이드아웃(320ms) 도중에 타이핑을 시작하면
  // placeholder가 "사라지는 중" 상태인 채로 언마운트된다. 그대로 두면 나중에 다시
  // 비웠을 때 같은 상태로 되살아나, opacity 0으로 끝나는 애니메이션이 재생되어
  // 글자가 아예 보이지 않는다.
  const handleInputChange = (e) => {
    const nextValue = e.target.value
    if (nextValue.trim() === '') setPhLeaving(false)
    setInputValue(nextValue)
  }

  return (
    <div className={`home-page${showWorkspace ? '' : ' home-page--empty'}`}>

      {/* 로고: absolute로 좌상단 고정 */}
      <h1 className="home-page__logo">IdeaLine</h1>

      {/* 콘텐츠 영역: flex:1로 작업공간 위 남은 공간 차지, 세로 중앙 정렬 */}
      <main className="home-page__content">

        {/* 타이틀 + 서브타이틀 */}
        <div className="home-page__hero">
          <h2 className="home-page__title">새로운 아이디어를 만들어보세요!</h2>
          <p className="home-page__subtitle">
            참여 중인 공모전 주제나 탐색하고 싶은 키워드를 자유롭게 입력해주세요
          </p>
        </div>

        {/* 입력창: 생성 중(isSubmitting)일 때만 회전 그라디언트 링(F1 Mono Blue) 표시 */}
        <div className="home-page__input-wrap">
          <GradientBorder active={isSubmitting} radius="var(--radius-container)">
            <input
              className="home-page__input"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isSubmitting}
              // placeholder 속성을 쓰지 않으므로(속성에는 애니메이션을 걸 수 없다)
              // 입력창의 이름을 aria-label로 직접 준다.
              // 없으면 스크린리더가 "편집창"이라고만 읽는다.
              aria-label="아이디어 주제 입력"
              aria-describedby="home-input-hint"
            />
            {/* 겹쳐 그리는 가짜 placeholder. 입력값이 있으면 아예 렌더하지 않는다.
                aria-hidden인 이유: 2.6초마다 바뀌는 내용을 낭독시키면
                다른 화면 낭독을 계속 끊는다. 예시는 아래 고정 문구가 대신 전한다. */}
            {isInputEmpty && (
              <span className="home-page__input-ph" aria-hidden="true">
                {/* key로 리마운트시켜 인덱스가 바뀔 때마다 진입 페이드를 다시 재생한다.
                    key 없이 글자만 갈아끼우면 애니메이션이 재생되지 않는다. */}
                <span
                  key={phIndex}
                  className={`home-page__input-ph-text home-page__input-ph-text--${phLeaving ? 'out' : 'in'}`}
                >
                  {PLACEHOLDER_EXAMPLES[phIndex]}
                </span>
              </span>
            )}
          </GradientBorder>
          {/* 스크린리더 전용 안내 — 회전하는 예시 대신 고정된 한 줄로 범위를 전한다.
              낭독은 시각과 달리 건너뛸 수 없어서, 바뀌는 내용을 그대로 읽히지 않는다. */}
          <p id="home-input-hint" className="home-page__sr-only">
            예: 1인 가구, 시니어 대중교통, AI 기술 기반 혁신적인 제품 및 서비스 아이디어
          </p>
          {/* 입력값 있으면 파란색, 없으면 회색 */}
          <button
            className={`home-page__input-btn${inputValue.trim() ? ' home-page__input-btn--active' : ''}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-label="아이디어 생성"
          >
            {/* 생성 중엔 회전하는 로더로 교체, 그 외엔 기존 화살표.
                준비 안 됨(입력 없음) → --color-unready-text, 입력 있음(active) → 흰색 */}
            {isSubmitting ? (
              <LoaderCircle
                size={20}
                color="var(--color-white)"
                className="home-page__input-btn-icon--spin"
              />
            ) : (
              <ArrowUp size={20} color={inputValue.trim() ? 'var(--color-white)' : 'var(--color-unready-text)'} />
            )}
          </button>
          {/* 생성 중 안내 문구 — Figma node 2633:23362, 입력창 하단 12px·가운데 정렬 */}
          {isSubmitting && (
            <p className="home-page__input-status" aria-live="polite">
              아이디어를 만들고 있어요
            </p>
          )}
        </div>

      </main>

      {/* 작업공간 패널 (Figma node 2816:1809).
          펼침/접힘 토글도, 패널 안쪽 스크롤도 없다 — 카드가 늘어나면 패널이
          그만큼 길어지고, 화면 밖으로 넘친 부분은 문서 전체를 스크롤해서 본다.

          캔버스가 0개면 이 섹션을 통째로 렌더하지 않는다(showWorkspace).
          빈 패널을 그리지 않는 것이 목적이고, 그 결과로 히어로가 화면 세로 중앙에
          놓인다 — 중앙 좌표를 따로 박는 게 아니라 패널이 빠진 만큼 콘텐츠 영역이
          남은 높이를 차지하는 방식이라, 패널이 생기면 자동으로 원래 배치로 돌아온다.
          (Figma node 2860:973) */}
      {showWorkspace && (
        <section className="home-page__workspace">

          {/* 섹션 헤더 */}
          <div className="home-page__workspace-header">
            <p className="home-page__workspace-title">작업공간</p>
            <p className="home-page__workspace-meta">
              {loading ? '불러오는 중' : `${canvases.length}개 캔버스`}
            </p>
          </div>

          <div className="home-page__canvas-grid">
            {canvases.map((canvas) => (
              <CanvasCard key={canvas.id} {...canvas} locked={isSubmitting} />
            ))}
          </div>

          {/* 생성 중 dim 스크림 — Figma node 2630:23176, 패널 전체를 덮되
              pointer-events:none으로 클릭은 그대로 카드까지 통과시킨다.
              패널의 자식이므로 캔버스 0개일 때는 패널과 함께 사라진다. */}
          {isSubmitting && <div className="home-page__workspace-dim" />}

        </section>
      )}
    </div>
  )
}

export default HomePage
