import { useReactFlow, useStore } from '@xyflow/react'
import { Plus, Minus, Maximize } from 'lucide-react'
import Tooltip from './Tooltip'
import './CanvasControls.css'

// 배율 비교용 허용치.
// zoomIn/zoomOut을 반복하면 부동소수점 오차 때문에 한계값과 정확히 같아지지 않는
// 경우가 있어, 아주 작은 여유를 두고 비교한다
const ZOOM_EPSILON = 0.0001

// 전체 보기 전환 시간(ms).
// 캔버스 진입 시 첫 fitView는 애니메이션 없이 즉시 맞추지만(카드가 좌측 상단에 있는
// 프레임이 새어 나오면 안 되므로), 버튼은 화면이 움직이는 것을 보여줘야 한다 —
// 그래야 "이 화면은 확대·축소되는 캔버스"라는 걸 알게 된다
const FIT_VIEW_DURATION = 200

// 툴팁 offset: 삼각형 끝과 버튼 사이의 간격(px).
// 캡슐 padding 4 + 캡슐 바깥 여백 4 = 8.
// 툴바가 같은 이유로 offset={8}을 쓴다 (Figma Desktop-384·385·386: 화살표 끝 x=80)
const TOOLTIP_OFFSET = 8

// 버튼 + 툴팁 한 벌.
//
// wrapper로 감싸는 이유는 둘이다.
//   ① Tooltip이 position: absolute로 잡을 기준점(position: relative)이 필요하다
//   ② 비활성 <button>은 브라우저가 마우스 이벤트를 발생시키지 않으므로,
//      hover를 버튼이 아니라 wrapper에서 받아야 비활성일 때도 툴팁이 뜬다
//
// 툴팁 문구는 상태와 무관하게 같다. 이 버튼들에는 보이는 라벨이 없어서
// 툴팁의 역할이 '상태 설명'이 아니라 '이름표'이기 때문이다.
// 비활성 이유(배율 한계)는 아이콘 회색으로 이미 전달되고, 그 상태는 사용자가
// 방금 직접 만든 것이라 따로 설명할 필요가 없다.
function ControlButton({ icon: Icon, label, onClick, disabled }) {
  return (
    <span className="canvas-controls__btn-wrap">
      <button
        className="canvas-controls__btn"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        <Icon size={24} />
      </button>
      {/* title 속성은 쓰지 않는다 — 브라우저 기본 툴팁과 겹쳐 두 개가 뜬다 */}
      <Tooltip text={label} placement="right" offset={TOOLTIP_OFFSET} />
    </span>
  )
}

// 캔버스 조정 컨트롤: 좌측 하단에 상시 표시되는 확대 · 축소 · 전체 보기
//
// 이 컨트롤은 캔버스 위에 놓인 물건이 아니라 '캔버스를 보는 창의 손잡이'다.
// 그래서 화면에 고정되고(ReactFlow의 Panel 안에 둔다) 카드만 확대·축소된다.
//
// 줌(연속 조정)과 전체 보기(단발 복구)는 성격이 다른 동작이라 캡슐을 둘로 나눴다.
// 구분선 대신 20px 간격이 그 구분을 맡는다.
//
// fitViewOptions — 캔버스 진입 시 첫 fitView와 같은 옵션을 받는다.
//                  같은 값을 써야 "전체 보기 = 처음 들어왔을 때 그 화면"으로 동작이 일치한다
function CanvasControls({ fitViewOptions }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  // 현재 배율과 줌 한계를 스토어에서 직접 읽는다.
  // App.jsx의 minZoom/maxZoom을 나중에 바꿔도 컨트롤이 따라가도록 하드코딩하지 않는다
  const zoom = useStore((s) => s.transform[2])
  const minZoom = useStore((s) => s.minZoom)
  const maxZoom = useStore((s) => s.maxZoom)

  const atMaxZoom = zoom >= maxZoom - ZOOM_EPSILON
  const atMinZoom = zoom <= minZoom + ZOOM_EPSILON

  return (
    <div className="canvas-controls">
      {/* 줌 그룹: 확대·축소는 서로 짝인 연속 동작이라 한 캡슐에 묶는다.
          세로 배치에서는 위가 확대다 */}
      <div className="canvas-controls__group">
        <ControlButton
          icon={Plus}
          label="확대"
          onClick={() => zoomIn()}
          disabled={atMaxZoom}
        />
        <ControlButton
          icon={Minus}
          label="축소"
          onClick={() => zoomOut()}
          disabled={atMinZoom}
        />
      </div>

      {/* 전체 보기: 카드를 화면 밖으로 놓쳤을 때의 유일한 복구 수단이라
          줌에 딸린 버튼이 아니라 독립된 캡슐로 세운다.
          어떤 배율에서도 의미가 있으므로 비활성 조건은 두지 않는다 */}
      <div className="canvas-controls__group">
        <ControlButton
          icon={Maximize}
          label="전체 보기"
          onClick={() => fitView({ ...fitViewOptions, duration: FIT_VIEW_DURATION })}
        />
      </div>
    </div>
  )
}

export default CanvasControls
