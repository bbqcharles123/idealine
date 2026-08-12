// ─────────────────────────────────────────────────────────────
// 디자인 시스템 진입점 (design-sync 전용)
//
// 앱 코드는 이 파일을 import하지 않는다. claude.ai/design으로 보낼
// 컴포넌트 번들을 만들기 위해서만 존재한다.
//
// 이 저장소의 컴포넌트는 전부 `export default`인데, 번들러는 default를
// 자동으로 이름 있는 export로 바꿔 주지 않는다. 그래서 여기서 전부
// `export { default as X }` 형태로 다시 공개한다.
// ─────────────────────────────────────────────────────────────

// 전역 CSS를 번들에 싣는다.
// Pretendard 폰트는 여기서 싣지 않는다 — .design-sync/fonts/ 의 woff2를
// cfg.extraFonts로 번들의 fonts/ 폴더에 직접 복사한다.
// index.css가 tokens.css와 @xyflow/react의 base.css를 @import하므로
// 이 한 줄로 토큰·리셋·React Flow 기본 스타일이 모두 포함된다.
import './src/index.css'
// public/ 의 아이콘 SVG를 data URI로 인라인한 CSS.
// 앱은 Vite가 public/을 서빙하지만 claude.ai/design에는 그 경로가 없어
// <img src="/xxx.svg"> 가 전부 404가 난다. 이 CSS가 그것을 덮어쓴다.
// 생성: node .design-sync/gen-icons-css.mjs
import '../.design-sync/icons.css'

// ── 프리뷰 래퍼용 컨텍스트 제공자 ──────────────────────────────
// 프리뷰 카드는 앱이 아니라 빈 페이지에서 렌더되므로,
// 컨텍스트를 읽는 컴포넌트(useNavigate·useReactFlow·Handle)를 위해
// 이 두 제공자를 번들 export로 노출해 둔다.
export { ReactFlowProvider } from '@xyflow/react'
export { MemoryRouter } from 'react-router-dom'

// ── 캔버스 · 공통 (group: general) ────────────────────────────
export { default as CanvasCard } from './src/components/CanvasCard.jsx'
export { default as CanvasHeader } from './src/components/CanvasHeader.jsx'
export { default as LayerStackNode } from './src/components/LayerStackNode.jsx'
export { default as SeedCard } from './src/components/SeedCard.jsx'
export { default as SidePanel } from './src/components/SidePanel.jsx'
export { default as Toolbar } from './src/components/Toolbar.jsx'

// ── 모달 (group: modals) ──────────────────────────────────────
// Modal* 4개는 모달을 조립하는 공용 파트, 나머지 4개는 완성형 모달이다.
export { default as ModalButton } from './src/components/modals/ModalButton.jsx'
export { default as ModalOption } from './src/components/modals/ModalOption.jsx'
export { default as ModalProgress } from './src/components/modals/ModalProgress.jsx'
export { default as ModalSkeleton } from './src/components/modals/ModalSkeleton.jsx'
export { default as StartModal } from './src/components/modals/StartModal.jsx'
export { default as ExpandModal } from './src/components/modals/ExpandModal.jsx'
export { default as TransformModal } from './src/components/modals/TransformModal.jsx'
export { default as WriteModal } from './src/components/modals/WriteModal.jsx'

// ── 사이드패널 파트 (group: panel) ────────────────────────────
export { default as IdeaSource } from './src/components/panel/IdeaSource.jsx'
export { default as InputTopic } from './src/components/panel/InputTopic.jsx'
export { default as QAContent } from './src/components/panel/QAContent.jsx'
export { default as RecReason } from './src/components/panel/RecReason.jsx'
export { default as RecToolCard } from './src/components/panel/RecToolCard.jsx'
export { default as ToolBadge } from './src/components/panel/ToolBadge.jsx'
export { default as Tooltip } from './src/components/panel/Tooltip.jsx'
export { default as UxAreaAccordion } from './src/components/panel/UxAreaAccordion.jsx'
export { default as UxAreaTag } from './src/components/panel/UxAreaTag.jsx'
export { default as UxCriterionTag } from './src/components/panel/UxCriterionTag.jsx'
export { default as UxEvaluationItem } from './src/components/panel/UxEvaluationItem.jsx'
export { default as UxItemName } from './src/components/panel/UxItemName.jsx'
export { default as UxStatusBadge } from './src/components/panel/UxStatusBadge.jsx'
