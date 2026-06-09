import { useState, useCallback, useEffect } from 'react'
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react'
import {
  Eraser, ArrowLeftRight, Scissors, Layers, Combine,
  Copy, ArrowRightLeft, RefreshCw, Lightbulb, Link, GitBranch,
  TrendingUp, TrendingDown, Sparkles, Ban,
} from 'lucide-react'
import { TOOL_LAYER_DESC } from '../data/toolLayerDesc.js'
import './LayerStackNode.css'

// PEEK_HEIGHT: 카드 아래로 도구 레이어가 뻗어나오는 총 높이 (42px)
// peek strip 자체 높이(34px)와 다름 — CSS에서 분리해서 관리
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
    textColor: '#2E7D32',
    label: '확장하기',
    desc: '이미 있는 요소를 하나 더 추가하되 조금 다르게 변형해보세요. 같은 듯 다른 요소가 새로운 가능성을 열어줍니다.',
  },
  transform: {
    textColor: '#7B61C4',
    label: '변형하기',
    desc: '기존 요소를 증가·감소·창출·제거해보세요. 변형을 통해 새로운 아이디어를 발견할 수 있습니다.',
  },
  // 직접작성: AI 추천 결과(writeRec)에 따라 레이블이 결정됨. 아이콘 없음
  write: {
    textColor: '#00695C',
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
  const { title, description, toolType, tagName, writeRec, isSelected, isHighlighted, onInfoClick } = data ?? {}
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)

  // 펼침/접힘으로 source 핸들의 DOM 위치가 바뀌면 React Flow에 알려 엣지를 다시 그리게 함
  const updateNodeInternals = useUpdateNodeInternals()

  // 펼침/접힘 애니메이션(440ms) 동안 매 프레임 핸들 위치를 재측정 → 엣지가 끊기지 않고 따라옴
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

  const tool = TOOL_CONFIG[toolType]

  // write 타입: AI 추천 카테고리 정보 (없으면 'expand' 기본값), 그 외 타입은 null
  const writeCat = toolType === 'write' ? (WRITE_REC[writeRec] ?? WRITE_REC.expand) : null

  // 헤더 라벨: write는 카테고리명('확장하기'), expand/transform은 tagName
  const headerLabel = writeCat ? writeCat.label : (tagName ?? tool?.label)

  // peek 라벨: write는 '카테고리명 추천', expand/transform은 tagName
  const peekLabel = writeCat ? `${writeCat.label} 추천` : (tagName ?? tool?.label)

  // tagName별 고유 설명 텍스트, 없으면 toolType 단위 generic desc 사용
  const tagDesc = TOOL_LAYER_DESC[toolType]?.[tagName] ?? tool?.desc

  // tagName에 해당하는 lucide 아이콘 컴포넌트 (expand/transform 타입만 해당, write는 null)
  const TagIcon = TAG_ICON[toolType]?.[tagName] ?? null

  // 도구 레이어 클릭 → 펼치기 (React Flow 노드 선택 이벤트 차단)
  const handleToolClick = useCallback((e) => {
    e.stopPropagation()
    if (!isExpanded) setIsExpanded(true)
  }, [isExpanded])

  // peek "아이디어 확인하기" 클릭 → 역방향 애니메이션 재생 후 접기
  const handleReturnClick = useCallback((e) => {
    e.stopPropagation()
    if (isCollapsing) return
    setIsCollapsing(true)
    setTimeout(() => {
      setIsExpanded(false)
      setIsCollapsing(false)
    }, 440)
  }, [isCollapsing])

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

      {/* expanded 시 빈(안 보이는 카드) 영역에서 React Flow 노드 선택/드래그/패닝 차단
          - React Flow v12는 pointerdown 기반 → onMouseDown 대신 onPointerDown으로 막아야 함
          - nodrag(노드 드래그 방지) + nopan(캔버스 패닝 방지) 클래스 병행
          - onClick stopPropagation으로 노드 선택(부모 하이라이트)까지 차단 */}
      {isExpanded && (
        <div
          className="lsn__drag-blocker nodrag nopan"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* ── 아이디어 레이어 (z:2) ── */}
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

      {/* ── 도구 레이어 (z:1 idle → z:3 expanded) ── */}
      {tool && (
        <div
          className={`lsn__tool lsn__tool--${toolType}${!isExpanded ? ' nodrag' : ''}`}
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

          {/* peek 스트립: 항상 표시
              idle     → [chip 아이콘] tagName
              expanded → "아이디어 확인하기" (클릭 시 접기) */}
          <div
            className="lsn__peek"
            onClick={isExpanded ? handleReturnClick : undefined}
          >
            {isExpanded ? (
              <span className="lsn__peek-label" style={{ color: 'var(--color-label)' }}>
                아이디어 확인하기
              </span>
            ) : (
              <>
                {/* write peek은 아이콘 없이 "추천" 텍스트만, expand/transform은 chip 아이콘+tagName */}
                {!writeCat && TagIcon && <TagIcon size={18} color={tool.textColor} strokeWidth={2} />}
                <span className="lsn__peek-label" style={{ color: tool.textColor }}>
                  {peekLabel}
                </span>
              </>
            )}
          </div>

          {/* source Handle을 도구 레이어 안쪽(peek 하단)에 배치
              → 접힘/펼침 모두에서 "보이는 하단"을 따라가므로 엣지가 끊기지 않음
              (useUpdateNodeInternals가 상태 변화 시 이 위치를 재측정) */}
          <Handle type="source" position={Position.Bottom} />
        </div>
      )}

      {/* 고스트 peek: 접힘 애니메이션 동안만 카드 뒤(z:1)에 idle peek을 미리 깔아둠
          → 앞쪽 도구가 sink로 사라질 때 빈틈 없이 peek이 계속 보이고,
            상태 리셋 시 실제 idle 도구가 같은 위치에 들어와 깜빡임이 없음 */}
      {tool && isCollapsing && (
        <div
          className={`lsn__tool lsn__tool--${toolType} lsn__tool--ghost`}
          style={{ '--peek': `${PEEK_HEIGHT}px` }}
        >
          <div className="lsn__peek">
            {!writeCat && TagIcon && <TagIcon size={18} color={tool.textColor} strokeWidth={2} />}
            <span className="lsn__peek-label" style={{ color: tool.textColor }}>
              {peekLabel}
            </span>
          </div>
        </div>
      )}

      {/* tool 레이어가 없는 예외 노드를 위한 fallback source Handle */}
      {!tool && <Handle type="source" position={Position.Bottom} />}
    </div>
  )
}

export default LayerStackNode
