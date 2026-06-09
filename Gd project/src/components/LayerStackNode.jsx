import { useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
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
  // 직접작성: tagName 없으므로 아이콘 없이 label만 표시
  write: {
    textColor: '#00695C',
    label: '직접작성',
    desc: '아이디어를 자유롭게 직접 작성해보세요.',
  },
}

function LayerStackNode({ id, data }) {
  const { title, description, toolType, tagName, isSelected, isHighlighted, onInfoClick } = data ?? {}
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)

  const tool = TOOL_CONFIG[toolType]

  // tagName별 고유 설명 텍스트, 없으면 toolType 단위 generic desc 사용
  const tagDesc = TOOL_LAYER_DESC[toolType]?.[tagName] ?? tool?.desc

  // tagName에 해당하는 lucide 아이콘 컴포넌트 (expand/transform 타입만 해당)
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

      {/* expanded 시 빈 공간에서 React Flow 드래그 시작을 차단하는 오버레이 */}
      {isExpanded && (
        <div
          className="lsn__drag-blocker"
          onMouseDown={(e) => e.stopPropagation()}
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
              {/* tagName에 맞는 lucide 아이콘, write 타입은 아이콘 없음 */}
              {TagIcon && <TagIcon size={20} color={tool.textColor} strokeWidth={2} />}
              <span className="lsn__tool-label" style={{ color: tool.textColor }}>
                {tagName ?? tool.label}
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
                {TagIcon && <TagIcon size={18} color={tool.textColor} strokeWidth={2} />}
                <span className="lsn__peek-label" style={{ color: tool.textColor }}>
                  {tagName ?? tool.label}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default LayerStackNode
