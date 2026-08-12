// 모달 선택지 — 확장/변형 모달의 Step 1·2에서 쓰는 단일 선택 버튼.
// 선택되면 테두리와 배경이 파랗게 바뀐다(두께는 그대로).
import { ModalOption } from 'gd-project'

// 모달 본문 폭에 맞춘다
const modalBody = { width: 468 }

// 미선택 상태
export const Unselected = () => (
  <div style={modalBody}>
    <ModalOption text="기존 요소를 합쳐서 새로운 쓰임을 만들고 싶다" isSelected={false} />
  </div>
)

// 선택된 상태
export const Selected = () => (
  <div style={modalBody}>
    <ModalOption text="기존 요소를 합쳐서 새로운 쓰임을 만들고 싶다" isSelected={true} />
  </div>
)

// 실제 모달의 선택지 목록 — 하나만 선택된 상태
export const OptionList = () => (
  <div style={{ ...modalBody, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <ModalOption text="지금 있는 기능을 다른 사용자층에도 쓰이게 하고 싶다" isSelected={false} />
    <ModalOption text="기존 요소를 합쳐서 새로운 쓰임을 만들고 싶다" isSelected={true} />
    <ModalOption text="당연하다고 여겼던 것을 반대로 뒤집어 보고 싶다" isSelected={false} />
    <ModalOption text="단계 하나를 덜어내 더 빠르게 쓰이게 하고 싶다" isSelected={false} />
  </div>
)
