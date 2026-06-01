import { useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import './LayerStackNode.css'

// Figma 스펙: peek 35px (h-[35px])
const PEEK_HEIGHT = 35

const TOOL_CONFIG = {
  expand: {
    textColor: '#2E7D32',
    icon: '/toolbar_btn_expand.svg',
    label: '확장하기',
    desc: '이미 있는 요소를 하나 더 추가하되 조금 다르게 변형해보세요. 같은 듯 다른 요소가 새로운 가능성을 열어줍니다.',
  },
  transform: {
    textColor: '#5E35B1',
    icon: '/toolbar_btn_change.svg',
    label: '변형하기',
    desc: '기존 요소를 증가·감소·창출·제거해보세요. 변형을 통해 새로운 아이디어를 발견할 수 있습니다.',
  },
}

function LayerStackNode({ id, data }) {
  const { title, description, toolType, isSelected, isHighlighted, onInfoClick } = data ?? {}
  const [isExpanded, setIsExpanded] = useState(false)

  const tool = TOOL_CONFIG[toolType]

  // Tool layer click → expand (stopPropagation prevents React Flow node selection)
  const handleToolClick = useCallback((e) => {
    e.stopPropagation()
    if (!isExpanded) setIsExpanded(true)
  }, [isExpanded])

  // "아이디어 카드 확인하기" click → collapse
  const handleReturnClick = useCallback((e) => {
    e.stopPropagation()
    setIsExpanded(false)
  }, [])

  const cls = [
    'lsn',
    isSelected ? 'lsn--selected' : '',
    isHighlighted ? 'lsn--highlighted' : '',
    isExpanded ? 'lsn--expanded' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls}>
      <Handle type="target" position={Position.Top} />

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
          {/* 확장 시 보이는 상단 콘텐츠 */}
          <div className="lsn__tool-main">
            <div className="lsn__tool-header">
              <img src={tool.icon} width={24} height={24} alt="" />
              <span className="lsn__tool-label" style={{ color: tool.textColor }}>
                {tool.label}
              </span>
            </div>
            <p className="lsn__tool-desc" style={{ color: tool.textColor }}>{tool.desc}</p>
            <button
              className="lsn__return nodrag"
              style={{ color: tool.textColor, borderColor: tool.textColor }}
              onClick={handleReturnClick}
            >
              아이디어 카드 확인하기
            </button>
          </div>

          {/* idle 상태에서 하단에 보이는 peek 스트립 */}
          <div className="lsn__peek">
            <img src={tool.icon} width={18} height={18} alt="" />
            <span className="lsn__peek-label" style={{ color: tool.textColor }}>
              {tool.label}
            </span>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default LayerStackNode
