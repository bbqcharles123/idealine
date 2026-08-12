// 모달 버튼 — 모달 하단 액션. filled(주 동작) / outline(이전으로) 두 종류가 전부다.
// width는 모달 종류에 따라 다르다: 시작카드생성 144px, 확장/변형/직접작성 222px.
import { ModalButton } from 'gd-project'

// 주 동작 — 파란 배경
export const Filled = () => <ModalButton>다음으로</ModalButton>

// 주 동작 비활성 — 선택 전 상태. 회색 배경, 클릭 불가
export const FilledDisabled = () => <ModalButton disabled>다음으로</ModalButton>

// 보조 동작 — 흰 배경 + 파란 테두리. 비활성 상태가 없다
export const Outline = () => <ModalButton variant="outline">이전으로</ModalButton>

// 모달 하단 실제 배치 — 이전/다음 한 쌍, 확장·변형 모달의 222px 폭
export const ModalFooter = () => (
  <div style={{ display: 'flex', gap: 12 }}>
    <ModalButton variant="outline" width={222}>이전으로</ModalButton>
    <ModalButton width={222}>카드 생성하기</ModalButton>
  </div>
)
