import { MoveUpRight } from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import './IdeaSource.css'

// 아이디어 출처 안내 컴포넌트: 직속 부모카드 제목 + MoveUpRight 아이콘 조합
// 클릭 시 사이드패널(우측 384px)을 제외한 캔버스 영역의 중앙에 부모카드가 위치하도록 화면 이동
function IdeaSource({ parentCard }) {
  const { setCenter, getZoom, getNode } = useReactFlow()

  const handleNavigate = () => {
    const node = getNode(parentCard.id)
    if (!node) return

    const zoom = getZoom()
    const nodeWidth  = node.measured?.width  ?? 356
    const nodeHeight = node.measured?.height ?? 200

    // 노드의 flow 좌표 중심
    const nodeCenterX = node.position.x + nodeWidth  / 2
    const nodeCenterY = node.position.y + nodeHeight / 2

    // setCenter(cx, cy) 는 flow 좌표 cx를 뷰포트 전체 중앙(W/2)에 배치함
    // 노드를 사이드패널(384px) 제외 영역의 중앙((W-384)/2)에 놓으려면:
    //   (W-384)/2 = W/2 + (nodeCenterX - cx) * zoom  를 cx에 대해 풀면
    //   cx = nodeCenterX + (384/2) / zoom
    const panelOffsetFlow = (384 / 2) / zoom

    setCenter(nodeCenterX + panelOffsetFlow, nodeCenterY, {
      duration: 600,
      zoom,
    })
  }

  return (
    <button className="idea-source" onClick={handleNavigate}>
      <span className="idea-source__title">{parentCard.data.title}</span>
      {/* absoluteStrokeWidth: strokeWidth를 화면상 px로 고정한다.
          이게 없으면 size(16)에 비례해 얇아져 1.33px로 렌더된다.
          1.67px는 파생카드 도구 레이어 헤더 아이콘과 같은 두께 */}
      <MoveUpRight className="idea-source__icon" size={16} strokeWidth={1.67} absoluteStrokeWidth />
    </button>
  )
}

export default IdeaSource
