import { useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import './LayerStackNode.css'

const PEEK_HEIGHT = 44 // px visible below card in idle

const TOOL_CONFIG = {
  expand: {
    bg: '#E8F5E9',
    border: '#C8E6C9',
    textColor: '#2E7D32',
    icon: '/toolbar_btn_expand.svg',
    label: '확장하기',
    desc: '이 아이디어를 다양한 방향으로 확장하는 도구입니다.',
  },
  transform: {
    bg: '#EDE8F9',
    border: '#D1C4E9',
    textColor: '#5E35B1',
    icon: '/toolbar_btn_change.svg',
    label: '변형하기',
    desc: '이 아이디어의 요소를 변형해보는 도구입니다.',
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
          className={`lsn__tool lsn__tool--${toolType} nodrag`}
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
            <p className="lsn__tool-desc">{tool.desc}</p>
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
