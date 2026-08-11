import { useState, useCallback, useEffect, useRef } from 'react'
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react'
import {
  Eraser, ArrowLeftRight, Scissors, Layers, Combine,
  Copy, ArrowRightLeft, RefreshCw, Lightbulb, Link, GitBranch,
  TrendingUp, TrendingDown, Sparkles, Ban, ArrowUp,
} from 'lucide-react'
import { TOOL_LAYER_DESC } from '../data/toolLayerDesc.js'
import './LayerStackNode.css'

// PEEK_HEIGHT: idle 상태에서 카드 아래로 도구 레이어가 노출되는 높이 (42px)
//              peek strip 자체 높이(34px)와 다름 — CSS에서 분리해서 관리
// 펼친 상태: 도구 레이어가 카드 아래로 내려오며 높이는 내용에 따라 auto.
//           아이디어 레이어와 20px 겹침 (overlap)은 CSS에서 처리
const PEEK_HEIGHT = 42

// tagName별 lucide-react 아이콘 컴포넌트 매핑
const TAG_ICON = {
  expand: {
    '제거':        Eraser,
    '대체':        ArrowLeftRight,
    '분할·분리':   Scissors,
    '용도통합':    Layers,
    '결합':        Combine,
    '복제':        Copy,
    '역전':        ArrowRightLeft,
    '재정의':      RefreshCw,
    '유추':        Lightbulb,
    '연결':        Link,
    '속성 의존성': GitBranch,
  },
  transform: {
    '증가': TrendingUp,
    '감소': TrendingDown,
    '창출': Sparkles,
    '제거': Ban,
  },
}

const TOOL_CONFIG = {
  expand: {
    textColor: 'var(--color-expand-text)',
    label: '확장하기',
    desc: '이미 있는 요소를 하나 더 추가하되 조금 다르게 변형해보세요. 같은 듯 다른 요소가 새로운 가능성을 열어줍니다.',
  },
  transform: {
    textColor: 'var(--color-transform-text)',
    label: '변형하기',
    desc: '기존 요소를 증가·감소·창출·제거해보세요. 변형을 통해 새로운 아이디어를 발견할 수 있습니다.',
  },
  // 직접작성: AI 추천 결과(writeRec)에 따라 레이블이 결정됨. 아이콘 없음
  write: {
    textColor: 'var(--color-write-text)',
    label: '직접작성',
    desc: '아이디어를 더 구체적으로 작성하면 더 정확한 도구를 추천받을 수 있습니다.',
  },
}

// 직접작성(write) 카드: AI가 추천한 도구 카테고리 (헤더는 카테고리명+아이콘, peek은 "추천")
// 아이콘은 PanelTool과 동일한 카테고리 자산 재사용 (시안의 branch/transform 아이콘과 일치)
const WRITE_REC = {
  expand:    { label: '확장하기', icon: '/panel_bcc_expand.svg' },
  transform: { label: '변형하기', icon: '/panel_errc_transform.svg' },
}

function LayerStackNode({ id, data }) {
  const { title, description, toolType, tagName, writeRec, writeExpect, isSelected, isHighlighted, onInfoClick, onWriteLayerToggle, onToolOpen, onToolExpand, onToolCollapse } = data ?? {}
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)

  // 도구 레이어 DOM 높이 측정용 ref
  const toolRef = useRef(null)

  // 펼침/접힘으로 source 핸들의 DOM 위치가 바뀌면 React Flow에 알려 엣지를 다시 그리게 함
  const updateNodeInternals = useUpdateNodeInternals()

  // 펼침/접힘 transition 동안 매 프레임 핸들 위치를 재측정 → 엣지가 끊기지 않고 따라옴
  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (now) => {
      updateNodeInternals(id)
      if (now - start < 480) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isExpanded, isCollapsing, id, updateNodeInternals])

  // 펼쳐진 직후 도구 레이어 실제 높이를 측정해 App에 전달 → 하위 노드 y좌표 이동
  // rAF로 한 프레임 뒤에 측정해 auto 높이가 DOM에 반영된 뒤 값을 읽음
  useEffect(() => {
    if (!isExpanded) return
    const raf = requestAnimationFrame(() => {
      if (toolRef.current) onToolExpand?.(id, toolRef.current.offsetHeight)
    })
    return () => cancelAnimationFrame(raf)
  }, [isExpanded, id, onToolExpand])

  const tool = TOOL_CONFIG[toolType]

  // write 타입: AI 추천 카테고리 정보 (없으면 'expand' 기본값), 그 외 타입은 null
  const writeCat = toolType === 'write' ? (WRITE_REC[writeRec] ?? WRITE_REC.expand) : null

  // 헤더 라벨: write는 카테고리명('확장하기'), expand/transform은 tagName
  const headerLabel = writeCat ? writeCat.label : (tagName ?? tool?.label)

  // peek 왼쪽 고정 텍스트: write는 '아이디어 발전 도구 추천', 나머지는 '아이디어 생성 도구'
  const peekCategoryLabel = toolType === 'write' ? '아이디어 발전 도구 추천' : '아이디어 생성 도구'

  // peek 오른쪽 칩 라벨: write는 카테고리명, expand/transform은 tagName
  const peekChipLabel = writeCat ? writeCat.label : (tagName ?? tool?.label)

  // 도구레이어 설명 텍스트
  // - write 카드: AI가 생성한 기대효과(writeExpect) 사용
  // - expand/transform: tagName별 고유 설명, 없으면 generic desc
  const tagDesc = (toolType === 'write' && writeExpect)
    ? writeExpect
    : (TOOL_LAYER_DESC[toolType]?.[tagName] ?? tool?.desc)

  // tagName에 해당하는 lucide 아이콘 컴포넌트 (expand/transform 타입만 해당, write는 null)
  const TagIcon = TAG_ICON[toolType]?.[tagName] ?? null

  // 도구 레이어 클릭 → 펼치기만 담당. 접기는 peek의 ArrowUp이 트리거
  const handleToolClick = useCallback((e) => {
    e.stopPropagation()
    if (!isExpanded) {
      setIsExpanded(true)
      onToolOpen?.(id)
      if (toolType === 'write') onWriteLayerToggle?.(true, writeRec, id)
    }
  }, [id, isExpanded, toolType, writeRec, onWriteLayerToggle, onToolOpen])

  // peek ArrowUp 클릭 → 접기. 도구 레이어 onClick과 분리해 영역을 명확히 구분
  const handlePeekCollapseClick = useCallback((e) => {
    e.stopPropagation()
    if (!isExpanded || isCollapsing) return
    setIsCollapsing(true)
    onToolCollapse?.(id)
    if (toolType === 'write') onWriteLayerToggle?.(false, writeRec, id)
    setTimeout(() => {
      setIsExpanded(false)
      setIsCollapsing(false)
    }, 320)
  }, [id, isExpanded, isCollapsing, toolType, writeRec, onWriteLayerToggle, onToolCollapse])

  const cls = [
    'lsn',
    isSelected    ? 'lsn--selected'    : '',
    isHighlighted ? 'lsn--highlighted' : '',
    isExpanded    ? 'lsn--expanded'    : '',
    isCollapsing  ? 'lsn--collapsing'  : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls}>
      <Handle type="target" position={Position.Top} />

      {/* ── 아이디어 레이어 (z:2) ──
          서랍 방식에서는 펼쳐도 아이디어 카드가 자리를 지키므로
          기존의 빈 카드 영역 드래그 차단(drag-blocker)이 필요 없음 */}
      <div className="lsn__card">
        <button
          className="lsn__info nodrag"
          onClick={(e) => { e.stopPropagation(); onInfoClick?.(id) }}
        >
          <img src="/info.svg" width={24} height={24} alt="정보" />
        </button>
        <p className="lsn__title">{title}</p>
        <p className="lsn__body">{description}</p>
      </div>

      {/* ── 도구 레이어 (z:1 idle → z:3 expanded) ──
          idle: 카드 뒤에서 하단 42px만 노출 / expanded: 앞으로 나와 카드 아래로 106px 펼침
          nodrag·nopan: 도구 레이어 위에서의 드래그가 노드 이동/캔버스 패닝으로 새지 않도록 */}
      {tool && (
        <div
          ref={toolRef}
          className={`lsn__tool lsn__tool--${toolType} nodrag nopan`}
          style={{ '--peek': `${PEEK_HEIGHT}px` }}
          onClick={handleToolClick}
        >
          {/* 확장 시 보이는 상단 콘텐츠 (idle 시 display:none) */}
          <div className="lsn__tool-main">
            <div className="lsn__tool-header">
              {/* write는 카테고리 svg 아이콘, expand/transform은 tagName lucide 아이콘 */}
              {writeCat
                ? <img src={writeCat.icon} width={20} height={20} alt="" />
                : (TagIcon && <TagIcon size={20} color={tool.textColor} strokeWidth={2} />)}
              <span className="lsn__tool-label" style={{ color: tool.textColor }}>
                {headerLabel}
              </span>
            </div>
            <p className="lsn__tool-desc" style={{ color: tool.textColor }}>{tagDesc}</p>
          </div>

          {/* peek 스트립: idle / expanded 모두 표시, 내용만 전환
              idle     → [카테고리 텍스트] [칩 아이콘 + 도구명]
              expanded → [카테고리 텍스트] [ArrowUp 아이콘]  ← 클릭 시 접기 */}
          <div
            className="lsn__peek"
            onClick={isExpanded ? handlePeekCollapseClick : undefined}
          >
            <span className="lsn__peek-category" style={{ color: tool.textColor }}>
              {peekCategoryLabel}
            </span>
            {isExpanded ? (
              /* 펼침: ArrowUp 아이콘이 접기 트리거임을 시각적으로 표현 */
              <ArrowUp size={18} color={tool.textColor} strokeWidth={2} />
            ) : (
              /* idle: 아이콘 + 도구명 칩 */
              <div className="lsn__peek-chip">
                {writeCat
                  ? <img src={writeCat.icon} width={18} height={18} alt="" />
                  : (TagIcon && <TagIcon size={18} color={tool.textColor} strokeWidth={2} />)
                }
                <span className="lsn__peek-label" style={{ color: tool.textColor }}>
                  {peekChipLabel}
                </span>
              </div>
            )}
          </div>

          {/* source Handle을 도구 레이어 안쪽(peek 하단)에 배치
              → 접힘/펼침 모두에서 "보이는 하단"을 따라가므로 엣지가 끊기지 않음
              (useUpdateNodeInternals가 상태 변화 시 이 위치를 재측정) */}
          <Handle type="source" position={Position.Bottom} />
        </div>
      )}

      {/* tool 레이어가 없는 예외 노드를 위한 fallback source Handle */}
      {!tool && <Handle type="source" position={Position.Bottom} />}
    </div>
  )
}

export default LayerStackNode
