// ERRC(Eliminate, Reduce, Raise, Create) 프레임워크 데이터
// 변형하기 모달에서 사용하는 4개 방향성 — 각 방향성에 도구가 1:1로 매핑됨
// question: Step 2에서 사용자에게 제시하는 질문 (AI 연동 전 하드코딩, 테스트용 "AI 생활 루틴 코치 앱" 기준)
export const ERRC_DIRECTIONS = [
  {
    label: '지금보다 더 강하게 밀어붙여야 할 것이 있다',
    tool: {
      name: '증가',
      icon: '/modal_infoui_errc_trending_up.svg',
      question:
        '이 서비스에서 지금보다 훨씬 더 강화했을 때 사용자 경험이 확실히 좋아질 것 같은 요소는 무엇인가요?',
    },
  },
  {
    label: '너무 복잡하거나 과한 부분을 줄이고 싶다',
    tool: {
      name: '감소',
      icon: '/modal_infoui_errc_trending_down.svg',
      question:
        '지금은 있지만 줄이거나 약화시키면 사용자가 덜 부담스러워할 것 같은 요소는 무엇인가요?',
    },
  },
  {
    label: '아직 없지만 있으면 좋을 것을 새로 만들고 싶다',
    tool: {
      name: '창출',
      icon: '/modal_infoui_errc_sparkles.svg',
      question:
        '이 서비스에 지금까지 없었지만 새롭게 추가한다면 차별적인 가치를 만들어낼 것 같은 요소는 무엇인가요?',
    },
  },
  {
    label: '당연하다고 여겼던 것을 과감하게 없애고 싶다',
    tool: {
      name: '제거',
      icon: '/modal_infoui_errc_ban.svg',
      question:
        '루틴 앱에서 당연하게 제공되는 알림, 일정 직접 입력, 피로도 수동 체크 중 없애도 오히려 사용 경험이 더 나아질 것 같은 요소가 있나요?',
    },
  },
]
