import { CircleCheck, Check } from 'lucide-react'
import ModalButton from './ModalButton'
import './GenerationProgress.css'

// 파생카드 생성 중 하단 영역: 3단계 체크리스트 + (진행 중엔 취소 버튼 / 완료되면 완료 배지)
// Figma Frame 1697(진행 중) · Frame 1710(완료), node-id 2582-2473 기준
// (직접작성 모달은 라벨이 달라 steps prop으로 오버라이드 — node-id 2611-2007)
const DEFAULT_STEPS = ['아이디어 생성', 'UX 평가', '카드 추가']

// steps: 체크리스트 라벨 3개 (생략 시 확장/변형 기본 라벨)
// stepStates: steps와 같은 순서의 'wait' | 'run' | 'done' 배열
// allDone: 3단계 모두 완료 — 취소 버튼 대신 완료 배지를 보여준다
// onCancel: 취소하기 버튼 클릭 핸들러 (allDone이면 사용되지 않음)
function GenerationProgress({ steps = DEFAULT_STEPS, stepStates, allDone, onCancel }) {
  return (
    <div className="generation-progress">
      <ul className="generation-checklist">
        {steps.map((label, i) => {
          const state = stepStates[i]
          return (
            <li key={label} className={`generation-checklist-item generation-checklist-item--${state}`}>
              <span className="generation-checklist-indicator">
                {state === 'done' && (
                  // 12px 한 크기로만 쓰이므로 absoluteStrokeWidth 보정이 필요 없다.
                  // (Figma 내보내기 SVG도 viewBox 12x12에 stroke-width 지정 없이 기본값 1을 그대로 씀 —
                  //  lucide 기본 strokeWidth=2를 size=12로 줄인 결과와 정확히 같다)
                  <CircleCheck size={12} />
                )}
                {state === 'run' && (
                  <span className="generation-checklist-pulse">
                    <span className="generation-checklist-pulse-halo" />
                    <span className="generation-checklist-pulse-dot" />
                  </span>
                )}
                {state === 'wait' && <span className="generation-checklist-ring" />}
              </span>
              <span className="generation-checklist-label">{label}</span>
            </li>
          )
        })}
      </ul>

      <div className="generation-progress-action">
        {allDone ? (
          // 정보 안내용 — 클릭 대상이 아니므로 버튼이 아니라 div로 마크업하고 pointer-events를 끈다
          <div className="generation-done-badge" role="status" aria-live="polite">
            <Check size={20} strokeWidth={2.5} absoluteStrokeWidth />
            <span>생성완료</span>
          </div>
        ) : (
          <ModalButton variant="cancel" width={209} onClick={onCancel}>
            취소하기
          </ModalButton>
        )}
      </div>
    </div>
  )
}

export default GenerationProgress
