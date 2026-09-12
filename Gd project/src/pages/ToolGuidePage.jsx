import { useState, useRef, useLayoutEffect } from 'react'
import { BCC_DIRECTIONS } from '../data/bccData.js'
import { ERRC_DIRECTIONS } from '../data/transformData.js'
import { TOOL_LAYER_DESC } from '../data/toolLayerDesc.js'
import { TAG_ICON } from '../data/toolIcons.js'
import './ToolGuidePage.css'

// 전시용 도구 안내 페이지 (가로 거치 아이패드 전용, 라우트: /tool-guide)
//
// [무엇을 위한 화면인가]
// 전시에서 관람객은 씨드카드가 만들어진 직후 "확장하기 · 변형하기 중 무엇을 누를까"에서 멈춘다.
// 서비스의 전제는 아이디어를 만들어가며 학습이 함께 일어나는 것인데, 전시에는 그 시간이 없다.
// 이 화면은 모니터 옆에 따로 거치해, 관람객이 도구 전체를 한눈에 보고 눌러서 설명을 읽게 한다.
//
// [앱 본체를 건드리지 않는다]
// 캔버스(App.jsx)와 홈(HomePage.jsx)에는 아무 영향이 없다. 라우트 하나가 늘어날 뿐이다.
// 문구·구조·아이콘을 새로 만들지 않고 기존 data 파일을 그대로 읽는 이유도 같다 —
// 여기서 문장을 새로 지으면 앱과 이 화면이 서로 다른 말을 하게 된다.

// ── 기준 캔버스 크기 ──
// 11인치 아이패드 가로 기준. 실제 기기 크기에 맞추는 일은 transform: scale()이 맡으므로
// 아래의 모든 좌표·치수는 이 1194 × 834 안에서만 계산하면 된다.
const BASE_W = 1194
const BASE_H = 834

// ── 휠 기하 ──
// NODE_D   도구 노드(원)의 지름
// R        노드 중심이 놓이는 반지름. 노드가 휠 경계에 딱 맞물리도록 (WHEEL_SIZE - NODE_D) / 2
// INNER_D  안쪽 원의 지름. 사분면 라벨이 들어갈 자리이며 R에 비례해 정한다
// CENTER_D 가운데 원(프레임워크 이름)의 지름
//
// 노드 11개가 겹치지 않으려면 중심 간 호 간격이 최소 76px(노드 68 + 여백 8) 필요하다.
// 지금 값으로 원둘레는 2π × 191 ≈ 1200이고 11로 나누면 109px이라 여유가 있다.
const WHEEL_SIZE = 450
const NODE_D = 68
const R = (WHEEL_SIZE - NODE_D) / 2
const INNER_D = Math.round(R * 1.42)
const CENTER_D = 100

// 각도(도) → 휠 좌표계의 x·y. 0도가 3시 방향이므로 12시는 -90도다.
function polar(deg, radius) {
  const rad = (deg * Math.PI) / 180
  return {
    x: WHEEL_SIZE / 2 + radius * Math.cos(rad),
    y: WHEEL_SIZE / 2 + radius * Math.sin(rad),
  }
}

// ── 도구 조회표 만들기 ──
// bccData / transformData는 '방향성 → 도구' 구조라, 도구 이름으로 방향성을 찾으려면 뒤집어야 한다.
// 확장은 방향성 하나에 도구가 여러 개(tools 배열), 변형은 1:1(tool 단수 객체)이라 둘을 흡수한다.
//
// dir(방향성 원문)을 함께 담는 것이 중요하다. 관람객이 모달 1단계에서 실제로 만날 문장이라,
// 이 화면에서 축약본만 보여주면 모니터로 돌아갔을 때 같은 도구에 도달하는 길을 찾지 못한다.
function buildToolMap(directions, toolType) {
  const map = {}
  directions.forEach((dir) => {
    const tools = dir.tools ?? [dir.tool]
    tools.forEach((tool) => {
      map[tool.name] = {
        name: tool.name,
        dir: dir.label,
        desc: TOOL_LAYER_DESC[toolType][tool.name],
        Icon: TAG_ICON[toolType][tool.name],
      }
    })
  })
  return map
}

const EXPAND_TOOLS = buildToolMap(BCC_DIRECTIONS, 'expand')
const TRANSFORM_TOOLS = buildToolMap(ERRC_DIRECTIONS, 'transform')

// ── 두 휠의 배치 ──
//
// order — 12시 기준 시계방향으로 도구를 놓는 순서.
//   데이터 파일의 배열 순서를 그대로 쓰지 않고 따로 두는 이유는, 이 순서가 '데이터'가 아니라
//   '그림'이기 때문이다. 같은 방향성에 속한 도구들이 휠에서 서로 이웃해 한 사분면을 이루도록
//   배치해야 사분면 라벨이 말이 된다.
//
// axis — 방향성 라벨 4개.
//   quadrant 모드(확장)에서는 사분면 안쪽에 놓이므로 우상 → 우하 → 좌하 → 좌상 순서다.
//   axis 모드(변형)에서는 도구와 같은 각도의 축 위에 놓이므로 order와 같은 순서다.
//
// mode — 'quadrant'는 안쪽 원 + 십자선을, 'axis'는 중심에서 각 노드로 뻗는 살을 그린다.
//   시작 각도도 달라진다: 확장(11개)은 12시를 비우고 양옆으로 벌어지도록 반 칸 돌리고,
//   변형(4개)은 12시에 노드가 놓이므로 돌리지 않는다.
const WHEELS = [
  {
    key: 'expand',
    label: '확장하기',
    mode: 'quadrant',
    tools: EXPAND_TOOLS,
    axis: ['요소 결합·추가', '외부 발상 차용', '전제 뒤집기', '기존 요소 변경'],
    order: [
      '복제', '용도통합', '결합',
      '유추', '연결', '속성 의존성',
      '재정의', '역전',
      '분할·분리', '대체', '제거',
    ],
  },
  {
    key: 'transform',
    label: '변형하기',
    mode: 'axis',
    tools: TRANSFORM_TOOLS,
    axis: ['강화하기', '줄이기', '없애기', '새로 만들기'],
    order: ['증가', '감소', '제거', '창출'],
  },
]

// ── 휠 한 벌 ──
// 색은 CSS 변수(--tg-ink / --tg-bg / --tg-line)로 컨테이너에 실어 내려보낸다.
// 위치만 계산해서 인라인으로 주고, 나머지 모양은 전부 CSS가 맡는다.
function Wheel({ wheel, selected, onSelect }) {
  const n = wheel.order.length
  const step = 360 / n
  const start = wheel.mode === 'quadrant' ? -90 + step / 2 : -90

  return (
    <div className={`tg-wheel tg-wheel--${wheel.key}`}>
      {/* 노드를 잇는 점선 원 — 노드 중심을 지난다 */}
      <div
        className="tg-wheel__ring"
        style={{ left: WHEEL_SIZE / 2 - R, top: WHEEL_SIZE / 2 - R, width: R * 2, height: R * 2 }}
      />

      {/* axis 모드: 중심에서 각 노드로 뻗는 살. 노드 앞에서 멈춰야 원 안으로 파고들지 않는다 */}
      {wheel.mode === 'axis' && wheel.order.map((name, i) => (
        <div
          key={`spoke-${name}`}
          className="tg-wheel__spoke"
          style={{
            left: WHEEL_SIZE / 2,
            top: WHEEL_SIZE / 2,
            width: R - NODE_D / 2,
            transform: `rotate(${start + step * i}deg)`,
          }}
        />
      ))}

      {/* quadrant 모드: 안쪽 원 + 십자선. 이 십자가 네 방향성의 경계를 그린다 */}
      {wheel.mode === 'quadrant' && (
        <>
          <div
            className="tg-wheel__inner"
            style={{
              left: WHEEL_SIZE / 2 - INNER_D / 2,
              top: WHEEL_SIZE / 2 - INNER_D / 2,
              width: INNER_D,
              height: INNER_D,
            }}
          />
          <div
            className="tg-wheel__cross tg-wheel__cross--v"
            style={{ left: WHEEL_SIZE / 2, top: WHEEL_SIZE / 2 - INNER_D / 2, height: INNER_D }}
          />
          <div
            className="tg-wheel__cross tg-wheel__cross--h"
            style={{ left: WHEEL_SIZE / 2 - INNER_D / 2, top: WHEEL_SIZE / 2, width: INNER_D }}
          />
        </>
      )}

      {/* 방향성 라벨 */}
      {wheel.axis.map((label, i) => {
        const deg = wheel.mode === 'quadrant' ? -45 + 90 * i : start + step * i
        const radius = wheel.mode === 'quadrant'
          ? INNER_D * 0.33
          : (CENTER_D / 2 + (R - NODE_D / 2)) / 2
        const { x, y } = polar(deg, radius)
        return (
          <div
            key={label}
            className={`tg-wheel__axis tg-wheel__axis--${wheel.mode}`}
            style={{ left: x, top: y }}
          >
            {label}
          </div>
        )
      })}

      {/* 가운데 원 — 프레임워크 이름 */}
      <div
        className="tg-wheel__hub"
        style={{
          left: WHEEL_SIZE / 2 - CENTER_D / 2,
          top: WHEEL_SIZE / 2 - CENTER_D / 2,
          width: CENTER_D,
          height: CENTER_D,
        }}
      >
        {wheel.label}
      </div>

      {/* 도구 노드 — 누르면 아래 설명이 바뀐다 */}
      {wheel.order.map((name, i) => {
        const tool = wheel.tools[name]
        const { x, y } = polar(start + step * i, R)
        const isOn = selected?.key === wheel.key && selected?.name === name
        const ToolIcon = tool.Icon

        return (
          <button
            key={name}
            type="button"
            className={`tg-node${isOn ? ' tg-node--on' : ''}`}
            style={{ left: x - NODE_D / 2, top: y - NODE_D / 2, width: NODE_D, height: NODE_D }}
            // 같은 도구를 다시 누르면 해제된다 — 관람객이 설명을 닫는 방법이 따로 필요 없다
            onClick={() => onSelect(isOn ? null : { key: wheel.key, ...tool })}
          >
            {ToolIcon && <ToolIcon size={20} strokeWidth={2} />}
            <span className="tg-node__label">{name}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── 설명 영역 ──
// 아무것도 고르지 않은 상태가 기본이다. 전시에서는 이 문장이 "눌러도 된다"는 유일한 신호라
// 회색으로 물러나게 두지 않고 또렷하게 둔다.
function ToolDetail({ selected }) {
  if (!selected) {
    return (
      <div className="tg-detail tg-detail--empty">
        <div className="tg-detail__prompt">도구를 눌러 설명을 확인하세요</div>
        <div className="tg-detail__hint">어떤 것부터 눌러도 괜찮아요</div>
      </div>
    )
  }

  const wheel = WHEELS.find((w) => w.key === selected.key)
  const ToolIcon = selected.Icon

  return (
    <div className={`tg-detail tg-detail--${selected.key}`}>
      <div className="tg-detail__head">
        {ToolIcon && <ToolIcon size={24} strokeWidth={2} />}
        <span className="tg-detail__name">{selected.name}</span>
        <span className="tg-detail__badge">{wheel.label}</span>
      </div>

      <p className="tg-detail__desc">{selected.desc}</p>

      {/* 방향성 원문 — 모달 1단계에서 그대로 만날 문장이라 여기서 미리 이어준다.
          이 줄이 없으면 관람객은 도구는 알아도 그 도구에 도달하는 길을 모른다. */}
      <div className="tg-detail__route">
        <b>이 도구를 고르려면</b> — {wheel.label}를 누르고
        <b>{` “${selected.dir}”`}</b>를 선택하세요
      </div>
    </div>
  )
}

function ToolGuidePage() {
  const [selected, setSelected] = useState(null)

  // 기준 캔버스(1194 × 834)를 실제 화면에 맞추는 배율.
  // 아이패드 모델마다 논리 해상도가 다르고, 사파리 주소창·하단 바 때문에 세로 높이도 유동적이다.
  // 배율 하나로 그 차이를 전부 흡수하면 시안과 픽셀 비율이 어긋나지 않는다.
  const [scale, setScale] = useState(1)
  const stageRef = useRef(null)

  // window.innerHeight 대신 실제로 배치된 요소 크기를 재는 이유:
  // iOS 사파리는 주소창이 접히고 펴질 때 innerHeight가 실제 표시 영역과 어긋나는 구간이 있다.
  // ResizeObserver는 레이아웃 결과를 직접 보므로 회전·주소창 변화에 모두 정확하다.
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return

    const fit = () => {
      const { width, height } = el.getBoundingClientRect()
      if (!width || !height) return
      setScale(Math.min(width / BASE_W, height / BASE_H))
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="tg-stage" ref={stageRef}>
      <div className="tg-page" style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})` }}>
        <header className="tg-header">
          <h1 className="tg-header__title">아이디어 발전 도구</h1>
          <p className="tg-header__sub">
            확장하기는 아이디어의 구성요소를, 변형하기는 가치의 수준을 다룹니다
          </p>
        </header>

        <div className="tg-wheels">
          {WHEELS.map((wheel) => (
            <Wheel key={wheel.key} wheel={wheel} selected={selected} onSelect={setSelected} />
          ))}
        </div>

        <ToolDetail selected={selected} />
      </div>
    </div>
  )
}

export default ToolGuidePage
