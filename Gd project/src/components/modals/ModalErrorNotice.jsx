import { TriangleAlert, RotateCw } from 'lucide-react'
import './ModalErrorNotice.css'

// AI 생성 실패 안내 UI: 만들어지지 못한 내용의 자리를 대신 차지하고, 재시도 수단을 제공한다.
// 확장하기·변형하기 모달이 여러 자리에서 같은 역할로 쓰므로 공용 파트로 둔다.
//
// 이 컴포넌트가 보이는 동안 해당 AI 결과값(질문·선택지 등)은 비어 있는 상태로 유지해야 한다.
// 오류 문구를 결과값에 넣으면 그 문구가 정상 결과로 취급되어
// 다음 AI 호출의 입력이나 카드 data에 그대로 저장되기 때문이다.
//
// variant: 오류가 대신하는 자리의 형태 — 배경·색·구성 요소는 같고 배치와 크기만 다르다
//   'bar'   — 질문 텍스트 박스 자리 (가로 한 줄)
//   'panel' — 선택지 목록 자리 (세로 중앙 정렬된 넓은 영역)
// message: 무엇을 만들지 못했는지 알리는 문구 (예: '질문을 만들지 못했어요')
// onRetry: '다시 생성' 클릭 시 실행할 재시도 함수 (모달의 fetchQuestion·fetchExamples)

// 경고 아이콘 크기는 형태별로 다르다 (버튼 안 아이콘은 18px로 공통이라 상수로 두지 않는다)
const ALERT_ICON_SIZE = { bar: 20, panel: 24 }

function ModalErrorNotice({ variant = 'bar', message, onRetry }) {
  return (
    <div className={`modal-error-notice modal-error-notice--${variant}`}>

      {/* 경고 아이콘 + 안내 문구 묶음
          bar에서는 이 묶음이 남는 가로 공간을 차지해 버튼을 오른쪽 끝으로 밀어내고,
          panel에서는 버튼 위에 놓이는 한 줄이 된다 */}
      <div className="modal-error-notice__head">
        {/* 아이콘(lucide 기본 color: currentColor)은 컨테이너의 오류 색을 상속받는다.
            absoluteStrokeWidth: strokeWidth를 화면상 px로 고정한다.
            이게 없으면 size에 비례해 얇아져 의도한 1.5px보다 가늘게 렌더된다 */}
        <TriangleAlert size={ALERT_ICON_SIZE[variant]} strokeWidth={1.5} absoluteStrokeWidth />
        <p className="modal-error-notice__text">{message}</p>
      </div>

      {/* 복구 담당 버튼: 오류 상태에서는 헤더의 재생성 버튼 대신 이 버튼만 노출된다.
          재생성 버튼은 "생성된 결과가 마음에 들지 않을 때" 쓰는 버튼이라
          결과가 아예 없는 오류 상태에서는 의미가 없다 */}
      <button className="modal-error-notice__retry" onClick={onRetry}>
        {/* 경고 아이콘과 같은 화면상 두께(1.5px). size가 달라도 absoluteStrokeWidth로 맞춰진다 */}
        <RotateCw size={18} strokeWidth={1.5} absoluteStrokeWidth />
        <span>다시 생성</span>
      </button>
    </div>
  )
}

export default ModalErrorNotice
