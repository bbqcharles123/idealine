import './AutoLayoutButton.css'

/**
 * 자동 정렬 버튼 — 캔버스 우측 상단
 *
 * 사용자가 옮겨둔 카드 위치를 모두 해제하고 트리 기본 배치로 되돌린다.
 * 카드 위치가 저장되기 시작하면서(B-1-c) '새로고침 = 초기화'라는 우연한 탈출구가
 * 사라졌기 때문에, 되돌릴 방법을 명시적인 버튼으로 제공한다 (설계 결정 로그 「확정 5」).
 * 정렬과 함께 화면을 전체 트리에 맞추므로, 카드를 멀리 옮겨 길을 잃었을 때의
 * 복귀 수단도 겸한다.
 */
function AutoLayoutButton({ onClick }) {
  return (
    <button type="button" className="auto-layout-btn" onClick={onClick}>
      자동 정렬
    </button>
  )
}

export default AutoLayoutButton
