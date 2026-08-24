import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { ReactFlow, applyNodeChanges, Panel, useNodesInitialized, useReactFlow } from '@xyflow/react'
import SeedCard from './components/SeedCard'
import LayerStackNode from './components/LayerStackNode'
import Toolbar from './components/Toolbar'
import WriteModal from './components/modals/WriteModal'
import ExpandModal from './components/modals/ExpandModal'
import TransformModal from './components/modals/TransformModal'
import SidePanel from './components/SidePanel'
import CanvasHeader from './components/CanvasHeader'
import AutoLayoutButton from './components/AutoLayoutButton'
import { getLayoutedElements } from './utils/layout'
import { generateDerivedCard, phrasesToHighlights, generateWriteCard } from './ai/deriveCard'

// React Flow에 커스텀 노드 타입 등록
// seed: 씨드카드 / layerstack: 파생카드(레이어 스택 방식)
const nodeTypes = {
  seed: SeedCard,
  layerstack: LayerStackNode,
}

// Firestore 문서를 업데이트하는 헬퍼
// 제목 저장이 이 시간을 넘기면 '지연'으로 본다.
//
// 측정으로 정한 값이다 (2026-08-23, Playwright 자동 측정):
//   현재 회선(연결 유지)     50회 — 중앙값 36ms  / 최대 96ms
//   Slow 4G(연결 유지)       15회 — 중앙값 335ms / 최대 358ms
//   Slow 3G(연결 유지)       10회 — 중앙값 279ms / 최대 288ms
//   Slow 4G 콜드 스타트       3회 — 1324 / 1287 / 1254ms
//
// 회선 속도보다 '연결 수립' 여부가 지배적이다. Firestore가 열어둔 롱폴링 연결을
// 재사용하는 동안에는 Slow 3G에서도 300ms 안팎이고, 페이지를 새로 연 직후
// 첫 저장만 1.3초대로 튄다. 그래서 실질 최댓값은 콜드 스타트의 약 1.3초.
//
// 3초 = 실질 최댓값의 약 2.3배. 거짓 양성(정상인데 지연 표시)이 훨씬 비싸므로
// 여유를 두되, 진짜 지연을 3초 안에 알린다. 2초는 마진이 부족해 권하지 않는다
const TITLE_SAVE_PENDING_MS = 3000

// cards/edges 배열을 저장할 때, expandCount/transformCount/writeCount도 함께 갱신
async function syncToFirestore(canvasId, nextCards, nextEdges) {
  if (!canvasId || canvasId === 'new') return

  const expandCount  = nextCards.filter((c) => c.data?.toolType === 'expand').length
  const transformCount = nextCards.filter((c) => c.data?.toolType === 'transform').length
  const writeCount   = nextCards.filter((c) => c.data?.toolType === 'write').length

  // React Flow 내부 전용 필드(measured, selected 등)와 함수 props는 Firestore에 저장하지 않음
  // JSON 직렬화/역직렬화로 함수와 undefined 값을 한 번에 제거 (Firestore는 undefined 거부)
  // manual: 사용자가 직접 옮긴 카드 표시. 이 목록에 없으면 저장되지 않아
  //         새로고침 후 Dagre가 그 카드를 다시 덮어쓴다 (B-1-c)
  const serializableCards = nextCards.map(({ id, type, position, data, manual }) =>
    JSON.parse(JSON.stringify({ id, type, position, data, manual }))
  )

  await updateDoc(doc(db, 'canvases', canvasId), {
    cards: serializableCards,
    edges: JSON.parse(JSON.stringify(nextEdges)),
    expandCount,
    transformCount,
    writeCount,
  })
}

function App() {
  // URL 파라미터에서 캔버스 id 추출 (/canvas/:id)
  const { id: canvasId } = useParams()

  // 캔버스 제목
  const [canvasTitle, setCanvasTitle] = useState('')

  // 제목 저장 상태: 'idle' | 'pending'(지연) | 'failed'(영구 실패)
  // 헤더의 40px 슬롯에 무엇을 그릴지 결정한다
  const [titleSaveState, setTitleSaveState] = useState('idle')

  // 지연 판정 타이머 — 저장이 끝나거나 화면을 떠날 때 정리한다
  const titlePendingTimerRef = useRef(null)

  // Firestore 로드 상태
  const [loadingCanvas, setLoadingCanvas] = useState(true)

  // 캔버스에 표시되는 전체 카드(노드) 배열
  const [cards, setCards] = useState([])

  // 카드 간 연결선(엣지) 배열
  const [edges, setEdges] = useState([])

  // 카드를 직접 클릭했을 때 선택된 카드 ID → 파란 테두리 + 툴바 표시
  const [selectedCardId, setSelectedCardId] = useState(null)

  // ⓘ 버튼을 클릭했을 때 선택된 카드 ID → 파란 테두리 + 사이드패널 열기 (툴바 없음)
  const [infoCardId, setInfoCardId] = useState(null)

  // 사이드패널 현재 활성 탭
  const [sidePanelTab, setSidePanelTab] = useState('info')

  // 현재 열려 있는 모달 종류
  const [activeModal, setActiveModal] = useState(null)

  // write 카드 도구 레이어 펼침 시 추천 도구
  const [writeRecTool, setWriteRecTool] = useState(null)

  // write 카드 도구 레이어가 펼쳐진 카드 ID
  const [writeLayerCardId, setWriteLayerCardId] = useState(null)

  // React Flow 노드 크기 측정 완료 여부
  const nodesInitialized = useNodesInitialized()

  // React Flow 스토어에서 최신 노드 배열 가져오는 함수 + 뷰포트를 노드에 맞추는 함수
  const { getNodes, fitView } = useReactFlow()

  // 캔버스 진입 후 화면 맞추기를 이미 실행했는지 여부
  // 최초 1회만 true가 되며, 이후 파생카드 생성 시에는 사용자가 맞춰둔 위치·확대를 건드리지 않는다
  const hasFitViewRef = useRef(false)

  // 첫 화면 맞추기가 끝났는지 여부
  // 카드가 좌측 상단에 그려진 프레임이 보이지 않도록, 이 값이 true가 될 때까지 캔버스를 감춰둔다
  const [isViewportReady, setIsViewportReady] = useState(false)

  // Firestore에서 캔버스 데이터 초기 로드
  useEffect(() => {
    // 유효한 캔버스 id가 없으면 로드할 것이 없다
    // 씨드카드 생성은 홈 화면에서 이루어지므로, 정상 흐름에서는 이 분기에 도달하지 않는다
    if (!canvasId || canvasId === 'new') {
      setLoadingCanvas(false)
      return
    }

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'canvases', canvasId))
        if (snap.exists()) {
          const data = snap.data()
          setCanvasTitle(data.title ?? '')
          setCards(data.cards ?? [])
          setEdges(data.edges ?? [])
        }
      } catch (err) {
        console.error('캔버스 로드 실패:', err)
      } finally {
        setLoadingCanvas(false)
      }
    }

    load()
  }, [canvasId])

  // 모든 노드 크기 측정 완료 시 Dagre 레이아웃 재계산
  //
  // 계산은 전부 하되, 적용은 골라서 한다 (B-1-a / 설계 결정 로그 「확정 5」)
  // Dagre를 끄면 새 카드가 놓일 자리를 직접 계산해야 한다. 카드 높이가 가변이라
  // 그 규칙을 손으로 쓰는 것은 Dagre 절반을 다시 만드는 일이므로, 계산은 그대로 두고
  // 결과를 카드에 써넣는 단계에만 조건을 건다.
  //   - manual 카드(사용자가 직접 옮긴 카드): Dagre 좌표를 무시하고 현재 위치 유지
  //   - 그 외 카드: Dagre 좌표 + '부모가 원래 자리에서 벗어난 양'
  // 부모의 이동량을 자손에게 대물림하므로, 부모를 옮기면 그 아래 가지 전체가
  // 모양을 유지한 채 따라온다. 깊이 제한은 없다
  useEffect(() => {
    if (!nodesInitialized) return

    const measuredNodes = getNodes()
    const { nodes: layoutedNodes } = getLayoutedElements(measuredNodes, edges)
    const dagrePos = new Map(layoutedNodes.map((n) => [n.id, n.position]))

    // 자식 → 부모 조회표. 트리 구조이므로 부모는 최대 1개
    const parentOf = new Map(edges.map((e) => [e.target, e.source]))
    // 부모를 따라 올라가며 깊이를 센다 (씨드카드 = 0)
    const depthOf = (id) => {
      let depth = 0
      let p = parentOf.get(id)
      while (p) {
        depth += 1
        p = parentOf.get(p)
      }
      return depth
    }

    setCards((prev) => {
      // 카드별 이동량(실제 좌표 - Dagre 좌표). 자식은 여기서 부모 값을 꺼내 쓴다
      const offset = new Map()
      const next = new Map(prev.map((c) => [c.id, c]))

      // 부모의 이동량이 먼저 정해져 있어야 자식이 물려받을 수 있으므로 깊이순으로 처리
      const ordered = [...prev].sort((x, y) => depthOf(x.id) - depthOf(y.id))

      ordered.forEach((card) => {
        const auto = dagrePos.get(card.id)
        const inherited = offset.get(parentOf.get(card.id)) ?? { x: 0, y: 0 }

        // 직접 옮긴 카드: 위치를 건드리지 않고, 얼마나 벗어났는지만 기록해 자손에게 물려준다
        if (card.manual && auto) {
          offset.set(card.id, {
            x: card.position.x - auto.x,
            y: card.position.y - auto.y,
          })
          return
        }

        // 나머지: 부모의 이동량을 그대로 이어받아 Dagre 좌표를 평행이동
        // x·y에 같은 값을 더하므로 '부모 아래에 자식' 관계(rankdir: TB)는 그대로 유지된다
        offset.set(card.id, inherited)
        if (auto) {
          next.set(card.id, {
            ...card,
            position: { x: auto.x + inherited.x, y: auto.y + inherited.y },
          })
        }
      })

      return prev.map((c) => next.get(c.id))
    })

    // 캔버스 진입 직후 첫 레이아웃일 때만 화면을 카드에 맞춘다
    // ReactFlow의 fitView prop은 Dagre 재배치 이전 좌표로 계산되어 카드가 화면 밖으로 밀리므로,
    // 재배치가 화면에 반영된 다음 프레임에 직접 호출한다
    // duration을 주지 않아 애니메이션 없이 즉시 중앙에 맞춘 뒤, 그 다음에 캔버스를 보여준다
    // fitView가 뷰포트에 반영되는 것을 기다리고(await) 한 프레임 더 넘긴 뒤 공개해야
    // 카드가 좌측 상단에 있는 프레임이 새어 나오지 않는다
    if (!hasFitViewRef.current) {
      hasFitViewRef.current = true
      requestAnimationFrame(async () => {
        await fitView({ padding: 0.2, maxZoom: 1 })
        requestAnimationFrame(() => setIsViewportReady(true))
      })
    }
  }, [nodesInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  // 선택된 파생카드의 바로 위 부모 카드 ID 계산
  const parentId = useMemo(() => {
    if (!selectedCardId) return null
    const edge = edges.find((e) => e.target === selectedCardId)
    return edge?.source ?? null
  }, [selectedCardId, edges])

  // 도구 레이어 클릭 핸들러
  const handleToolOpen = useCallback((cardId) => {
    setInfoCardId((prev) => (prev !== null && prev !== cardId ? null : prev))
  }, [])

  // 펼친 노드별 { descendants, delta } 저장 — 접힘 시 복귀에 사용
  // (상태가 아닌 ref로 관리해 불필요한 리렌더링 방지)
  const expandedNodeDeltasRef = useRef({})

  // LayerStackNode.css의 --overlap과 반드시 동일하게 유지
  const TOOL_OVERLAP = 20
  // LayerStackNode.jsx의 PEEK_HEIGHT와 반드시 동일하게 유지 (idle 시 카드 아래 노출 높이)
  const PEEK_HEIGHT = 42

  // 도구 레이어 펼침: 실제 도구 레이어 DOM 높이를 받아 하위 노드를 아래로 밀어냄
  // delta = 도구 레이어가 펼쳐지며 "카드 아래로 보이는 하단"이 자라난 양
  //       = (펼친 후 도구 레이어가 카드 하단 아래로 뻗는 높이) - (idle 시 노출 높이)
  //       = (toolHeight - OVERLAP) - PEEK_HEIGHT
  // 이 값만큼만 하위 노드를 내리면, 각 노드가 펼치기 전 가지고 있던 간격을
  // 실제 위치와 무관하게 그대로 보존한다 (사용자가 노드를 옮긴 뒤에도 겹치지 않음)
  // delta > 0 인 경우에만 이동 (도구 레이어가 기존 peek보다 더 내려오지 않으면 이동 불필요)
  const handleToolExpand = useCallback((nodeId, toolHeight) => {
    const delta = toolHeight - TOOL_OVERLAP - PEEK_HEIGHT
    if (delta <= 0) return

    // BFS로 nodeId의 모든 하위 노드(자식·손자·...) ID 수집
    const descendants = []
    const visited = new Set()
    const queue = [nodeId]
    while (queue.length) {
      const cur = queue.shift()
      edges.filter((e) => e.source === cur).forEach((e) => {
        if (!visited.has(e.target)) {
          visited.add(e.target)
          descendants.push(e.target)
          queue.push(e.target)
        }
      })
    }
    if (descendants.length === 0) return

    expandedNodeDeltasRef.current[nodeId] = { descendants, delta }
    setCards((prev) =>
      prev.map((card) =>
        descendants.includes(card.id)
          ? { ...card, position: { ...card.position, y: card.position.y + delta } }
          : card
      )
    )
  }, [edges])

  // 도구 레이어 접힘: 펼칠 때 이동한 만큼 하위 노드를 원래 위치로 복귀
  const handleToolCollapse = useCallback((nodeId) => {
    const entry = expandedNodeDeltasRef.current[nodeId]
    if (!entry) return
    const { descendants, delta } = entry
    delete expandedNodeDeltasRef.current[nodeId]
    setCards((prev) =>
      prev.map((card) =>
        descendants.includes(card.id)
          ? { ...card, position: { ...card.position, y: card.position.y - delta } }
          : card
      )
    )
  }, [])

  // write 카드 도구 레이어 펼침/접힘 핸들러
  const handleWriteLayerToggle = useCallback((isOpen, recTool, cardId) => {
    setWriteRecTool(isOpen ? recTool : null)
    setWriteLayerCardId(isOpen ? cardId : null)
  }, [])

  // ⓘ 버튼 클릭 핸들러
  const handleInfoClick = useCallback((id) => {
    setInfoCardId(id)
    setSelectedCardId(null)
    setWriteRecTool(null)
    setWriteLayerCardId(null)
  }, [])

  // 카드 클릭 핸들러
  const handleNodeClick = useCallback((event, node) => {
    setSelectedCardId(node.id)
    setInfoCardId(null)
    setActiveModal(null)
    setWriteRecTool(null)
    setWriteLayerCardId(null)
  }, [])

  // 캔버스 빈 공간 클릭: 모든 선택 상태 해제
  const handlePaneClick = useCallback(() => {
    setSelectedCardId(null)
    setInfoCardId(null)
    setActiveModal(null)
    setWriteRecTool(null)
    setWriteLayerCardId(null)
  }, [])

  // 캔버스 제목 변경: 화면에 먼저 반영한 뒤 Firestore에 저장하고,
  // 저장 상태를 헤더 배지로 알린다.
  //
  // 제목은 어떤 경우에도 되돌리지 않는다.
  // 되돌리면 두 가지가 어긋난다 — (1) 지연은 네트워크가 돌아오면 저절로 성공하므로,
  // 되돌려 두면 나중에 화면과 DB가 반대로 어긋난다. (2) 영구 실패에서도 사용자가 쓴 이름이
  // 화면에 남아 있어야 다시 시도할 마음이 생긴다. 조용히 되돌리면 무슨 일이 있었는지 알 수 없다.
  const handleTitleChange = useCallback(async (nextTitle) => {
    // 값이 그대로면 저장할 것이 없다
    // (편집 후 고치지 않고 확정했거나, 빈 입력이라 원래 제목으로 되돌아온 경우)
    if (nextTitle === canvasTitle) return

    // 화면 먼저 갱신 — 저장을 기다리는 동안 입력이 멈춘 것처럼 보이지 않게 한다
    setCanvasTitle(nextTitle)

    // 유효한 캔버스 id가 없으면 저장할 대상이 없다 (정상 흐름에서는 도달하지 않음)
    if (!canvasId || canvasId === 'new') return

    // 새 저장을 시작하면 직전 시도의 표시와 타이머를 먼저 지운다.
    // 실패 배지가 떠 있었다면 여기서 사라지고, 이번 결과로 다시 판정된다
    clearTimeout(titlePendingTimerRef.current)
    setTitleSaveState('idle')

    // 임계시간을 넘길 때만 '지연'을 띄운다.
    // 성공하는 저장도 수백 ms의 대기를 지나므로, 즉시 띄우면 정상 저장마다 깜빡인다
    titlePendingTimerRef.current = setTimeout(() => {
      setTitleSaveState('pending')
    }, TITLE_SAVE_PENDING_MS)

    try {
      // title 필드만 갱신한다. cards/edges까지 통째로 다시 쓰는 syncToFirestore를 쓰지 않는 이유는
      // 제목과 무관한 데이터를 함께 덮어써, 그 시점의 상태가 최신이 아닐 경우 되돌릴 위험이 있기 때문이다
      await updateDoc(doc(db, 'canvases', canvasId), { title: nextTitle })
      clearTimeout(titlePendingTimerRef.current)
      setTitleSaveState('idle')
    } catch (err) {
      // 여기에 도달하는 것은 권한 오류처럼 기다려도 해결되지 않는 실패뿐이다.
      // 네트워크 단절은 Firestore가 큐에 넣고 재시도하므로 reject되지 않는다 —
      // 그 경우는 위 타이머가 '지연'으로 잡는다
      console.error('캔버스 제목 저장 실패:', err)
      clearTimeout(titlePendingTimerRef.current)
      setTitleSaveState('failed')
    }
  }, [canvasId, canvasTitle])

  // 화면을 떠날 때 지연 판정 타이머를 정리한다 (언마운트 후 상태 갱신 방지)
  useEffect(() => () => clearTimeout(titlePendingTimerRef.current), [])

  // 카드 생성 직후 새 카드로 선택을 옮긴다 (카드를 직접 클릭한 것과 같은 상태)
  // 왜 부모 선택을 유지하지 않는가:
  //  1) 화면을 건드리지 않고 "무엇이 생겼는지" 알리는 유일한 신호다.
  //     파생카드는 파란 배경·테두리(isSelected), 부모는 노란 배경·테두리(isHighlighted)가 되어
  //     생성 결과와 그 출처가 한눈에 구분된다. (뷰포트는 자동 조정하지 않기로 했으므로 카메라는 그대로 둔다)
  //  2) 부모 선택을 유지하면 생성 직후 파란 카드가 방금 만든 카드가 아니라 예전 부모다.
  //     그 상태에서 툴바의 확장하기를 누르면 새 카드가 아니라 부모에서 또 파생되어 대상이 어긋난다.
  // 부모로 다른 도구를 쓰고 싶으면 노란색으로 표시된 부모를 한 번 클릭하면 된다.
  const selectNewCard = useCallback((newId) => {
    setSelectedCardId(newId)
    setInfoCardId(null)
    setWriteRecTool(null)
    setWriteLayerCardId(null)
  }, [])

  // 툴바 및 모달 연산의 기준 카드 ID
  const effectiveCardId = selectedCardId ?? writeLayerCardId

  // 선택된 카드 데이터
  const selectedCard = cards.find((c) => c.id === effectiveCardId) ?? null

  // 사이드패널에 표시할 카드 데이터
  const infoCard = cards.find((c) => c.id === infoCardId) ?? null

  // 아이디어 출처 섹션용 직속 부모 카드
  const infoParentCard = useMemo(() => {
    if (!infoCardId) return null
    const edge = edges.find((e) => e.target === infoCardId)
    if (!edge) return null
    return cards.find((c) => c.id === edge.source) ?? null
  }, [infoCardId, edges, cards])

  // 파생카드 생성 공통 로직(호출 5): AI로 본문·하이라이트·UX평가를 받아 카드 추가
  // toolType: 'expand' | 'transform'
  // signal: 모달이 생성 중 X 아이콘으로 취소하면 전달되는 AbortSignal
  // onProgress: 생략 가능 — 대기 UI 체크리스트 갱신용. 호출 A/B 완료는 generateDerivedCard가 직접 넘기고,
  //   카드가 실제로 캔버스에 추가된 시점은 여기서 'cardAdded'로 알려준다.
  const createDerivedCard = useCallback(async (answer, toolName, question, toolType, signal, onProgress) => {
    // 부모 카드 본문을 AI 입력으로 사용
    const parent = cards.find((c) => c.id === effectiveCardId)
    const result = await generateDerivedCard(parent?.data?.description ?? '', question, answer, toolName, toolType, signal, onProgress)

    // AI가 반환한 강조 문구를 answer 기준 {start,end} 인덱스로 변환
    const highlights = phrasesToHighlights(answer, result.highlightPhrases)

    const newId = `derived-${Date.now()}`
    const newCard = {
      id: newId,
      type: 'layerstack',
      position: { x: 0, y: 0 },
      data: {
        title: result.title,
        description: result.description,
        answer,                  // 사용자 원문 (사이드패널 Q&A)
        question,                // 모달 질문 (사이드패널 Q&A)
        highlights,              // Q&A 답변 하이라이트
        uxData: result.uxData,   // UX 평가 탭
        toolType,
        tagName: toolName,
      },
    }
    const newEdge = { id: `e-${effectiveCardId}-${newId}`, source: effectiveCardId, target: newId }
    const nextCards = [...cards, newCard]
    const nextEdges = [...edges, newEdge]

    setCards(nextCards)
    setEdges(nextEdges)
    syncToFirestore(canvasId, nextCards, nextEdges)
    // 카드는 이미 추가됐지만, 대기 UI가 "생성완료" 배지를 스치듯 보여줄 시간을 준 뒤에 모달을 닫는다
    // (배지 없이 곧바로 닫히면 화면이 갑자기 바뀌는 느낌을 준다)
    onProgress?.('cardAdded')
    await new Promise((resolve) => setTimeout(resolve, 1300))
    setActiveModal(null)
    // 모달을 닫으면서 방금 만든 파생카드를 선택 상태로 만든다
    selectNewCard(newId)
  }, [effectiveCardId, canvasId, cards, edges, selectNewCard])

  // 확장하기 모달 완료
  // 실패를 여기서 잡지 않고 그대로 모달로 던진다.
  // 모달이 하단에 오류 문구와 '다시 생성하기' 버튼을 띄워, 사용자가 작성한 답변을 유지한 채
  // 그 자리에서 재시도할 수 있게 한다 (alert은 답변 화면 밖으로 나가는 안내라 재시도로 이어지지 않는다)
  const handleExpandSubmit = useCallback(async (answer, toolName, question, signal, onProgress) => {
    await createDerivedCard(answer, toolName, question, 'expand', signal, onProgress)
  }, [createDerivedCard])

  // 변형하기 모달 완료 (실패 처리는 확장하기와 동일하게 모달이 맡는다)
  const handleTransformSubmit = useCallback(async (answer, toolName, question, signal, onProgress) => {
    await createDerivedCard(answer, toolName, question, 'transform', signal, onProgress)
  }, [createDerivedCard])

  // 직접작성 모달 완료(호출 6): AI로 추천 도구·기대효과·추천이유·UX평가를 받아 카드 추가
  // 실패를 여기서 잡지 않고 그대로 모달로 던진다 (확장·변형과 동일하게 모달이 오류 UI로 알리고 재시도를 받는다)
  // onProgress: 생략 가능 — 대기 UI 체크리스트 갱신용. content/uxEval 완료는 generateWriteCard가 직접 넘기고,
  //   카드가 실제로 캔버스에 추가된 시점은 여기서 'cardAdded'로 알려준다.
  const handleWriteSubmit = useCallback(async (title, description, signal, onProgress) => {
    const result = await generateWriteCard(title, description, signal, onProgress)
    const newId = `derived-${Date.now()}`
    const newCard = {
      id: newId,
      type: 'layerstack',
      position: { x: 0, y: 0 },
      data: {
        title,
        description,
        toolType: 'write',
        writeRec: result.writeRec,             // 추천 카테고리 (도구레이어·RecToolCard)
        writeExpect: result.writeExpect,       // 기대효과 (도구레이어 설명)
        writeRecReason: result.writeRecReason, // 추천 이유 (상세패널)
        uxData: result.uxData,                 // UX 평가 탭
      },
    }
    const newEdge = { id: `e-${effectiveCardId}-${newId}`, source: effectiveCardId, target: newId }
    const nextCards = [...cards, newCard]
    const nextEdges = [...edges, newEdge]

    setCards(nextCards)
    setEdges(nextEdges)
    syncToFirestore(canvasId, nextCards, nextEdges)
    // 카드는 이미 추가됐지만, 대기 UI가 "생성완료" 배지를 스치듯 보여줄 시간을 준 뒤에 모달을 닫는다
    // (배지 없이 곧바로 닫히면 화면이 갑자기 바뀌는 느낌을 준다)
    onProgress?.('cardAdded')
    await new Promise((resolve) => setTimeout(resolve, 1300))
    setActiveModal(null)
    // 모달을 닫으면서 방금 만든 직접작성 카드를 선택 상태로 만든다
    selectNewCard(newId)
  }, [effectiveCardId, canvasId, cards, edges, selectNewCard])

  // 카드 드래그 등 React Flow 내부 노드 변경사항 처리
  const handleNodesChange = useCallback((changes) => {
    setCards((prev) => applyNodeChanges(changes, prev))
  }, [])

  // 카드 드래그 종료: 옮겨진 좌표를 Firestore에 저장하고 manual 표시를 붙인다 (B-1-c)
  // 드래그 '중'에는 저장하지 않는다. 매 프레임 쓰기가 발생해 요금과 지연이 커진다.
  // 세 번째 인자 draggedNodes는 여러 카드를 함께 옮겼을 때의 전체 목록이다.
  // 한 장만 옮겼을 때도 배열로 들어오지만, 값이 없는 경우를 대비해 node로 대체한다.
  const handleNodeDragStop = useCallback((_, node, draggedNodes) => {
    const moved = new Map(
      (draggedNodes?.length ? draggedNodes : [node]).map((n) => [n.id, n.position])
    )
    const next = cards.map((card) =>
      moved.has(card.id)
        ? { ...card, position: moved.get(card.id), manual: true }
        : card
    )
    setCards(next)
    // 저장 실패는 콘솔로만 알린다. 제목과 달리 좌표는 화면에 이미 반영되어 있어
    // 배지를 띄우면 캔버스 조작 중에 시선을 뺏는다 (실패 시 새로고침하면 이전 위치로 복귀)
    syncToFirestore(canvasId, next, edges).catch((err) =>
      console.error('카드 위치 저장 실패:', err)
    )
  }, [cards, edges, canvasId])

  // 자동 정렬: 사용자가 옮겨둔 위치를 모두 버리고 Dagre 기본 배치로 되돌린다 (B-1-b)
  // manual 표시를 전부 지운 뒤 Dagre 좌표를 그대로 적용하므로, 대물림 계산 없이
  // 캔버스 진입 직후와 동일한 트리 모양이 된다
  const handleAutoLayout = useCallback(() => {
    const measuredNodes = getNodes()
    const { nodes: layoutedNodes } = getLayoutedElements(measuredNodes, edges)
    const dagrePos = new Map(layoutedNodes.map((n) => [n.id, n.position]))

    const next = cards.map((card) => {
      const auto = dagrePos.get(card.id)
      // manual: undefined — Firestore 저장 시 JSON 직렬화가 undefined 필드를 지운다
      return { ...card, position: auto ?? card.position, manual: undefined }
    })

    setCards(next)
    syncToFirestore(canvasId, next, edges).catch((err) =>
      console.error('자동 정렬 저장 실패:', err)
    )

    // 정렬된 좌표가 화면에 반영된 다음 프레임에 화면을 맞춘다
    // (카드를 멀리 옮겨 길을 잃은 상태에서도 전체 트리로 돌아올 수 있게 한다)
    requestAnimationFrame(() => fitView({ padding: 0.2, maxZoom: 1, duration: 300 }))
  }, [cards, edges, canvasId, getNodes, fitView])

  // 렌더링 직전 카드 배열에 동적 상태값 주입
  const nodes = useMemo(
    () =>
      cards.map((card) => ({
        ...card,
        data: {
          ...card.data,
          isSelected: card.id === selectedCardId || card.id === infoCardId,
          isHighlighted: card.id === parentId,
          onInfoClick: handleInfoClick,
          onToolOpen: handleToolOpen,
          onToolExpand: handleToolExpand,
          onToolCollapse: handleToolCollapse,
          onWriteLayerToggle: card.data?.toolType === 'write' ? handleWriteLayerToggle : undefined,
        },
      })),
    [cards, selectedCardId, infoCardId, parentId, handleInfoClick, handleToolOpen, handleToolExpand, handleToolCollapse, handleWriteLayerToggle]
  )

  // Firestore 로드 완료 전에는 빈 화면 표시
  if (loadingCanvas) {
    return <div style={{ width: '100%', height: '100vh', background: 'var(--color-background)' }} />
  }

  return (
    <div style={{ width: '100%', height: '100vh', background: 'var(--color-background)' }}>
      {/* 캔버스 상단 고정 헤더 */}
      <CanvasHeader
        title={canvasTitle}
        onTitleChange={handleTitleChange}
        saveState={titleSaveState}
      />

      {/* 확장하기 모달 */}
      {activeModal === 'expand' && (
        <ExpandModal
          selectedCard={selectedCard}
          onClose={() => setActiveModal(null)}
          onSubmit={handleExpandSubmit}
        />
      )}

      {/* 변형하기 모달 */}
      {activeModal === 'transform' && (
        <TransformModal
          selectedCard={selectedCard}
          onClose={() => setActiveModal(null)}
          onSubmit={handleTransformSubmit}
        />
      )}

      {/* 직접작성 모달 */}
      {activeModal === 'write' && (
        <WriteModal
          onClose={() => setActiveModal(null)}
          onSubmit={handleWriteSubmit}
        />
      )}

      {/* 사이드패널 */}
      {infoCardId && (
        <SidePanel
          card={infoCard}
          parentCard={infoParentCard}
          tab={sidePanelTab}
          onTabChange={setSidePanelTab}
          onClose={() => setInfoCardId(null)}
        />
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        deleteKeyCode={null}
        // 기본값(0.5)이면 카드가 많아졌을 때 최대로 축소해도 전체 트리가 화면에 안 담김
        minZoom={0.05}
        onNodesChange={handleNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        defaultEdgeOptions={{
          type: 'smoothstep',
          // 엣지 선 색: --color-disabled와 값이 같지만 엣지는 '비활성 상태'가 아니므로
          // 의미가 맞지 않아 토큰을 쓰지 않고 값으로 둔다
          style: { stroke: '#9E9E9E', strokeWidth: 1.5 },
          pathOptions: { borderRadius: 8 },
        }}
        // 첫 화면 맞추기 전까지 감춰서 카드가 좌측 상단에 있는 순간이 보이지 않게 한다
        // 카드가 없는 새 캔버스는 맞출 대상이 없으므로 바로 보여준다
        style={{ opacity: isViewportReady || cards.length === 0 ? 1 : 0 }}
      >
        {/* 자동 정렬 — 카드가 있을 때만. 헤더(top 24 / left 28)와 같은 여백으로 우측 상단에 둔다 */}
        {cards.length > 0 && (
          <Panel position="top-right" style={{ margin: '24px 28px 0 0' }}>
            <AutoLayoutButton onClick={handleAutoLayout} />
          </Panel>
        )}

        {(selectedCardId || writeLayerCardId) && (
          <Panel position="bottom-center" style={{ marginBottom: '20px' }}>
            <Toolbar
              activeModal={activeModal}
              onExpand={() => setActiveModal('expand')}
              onTransform={() => setActiveModal('transform')}
              onWrite={() => setActiveModal('write')}
              recTool={
                selectedCardId === null || selectedCardId === writeLayerCardId
                  ? writeRecTool
                  : null
              }
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}

export default App
