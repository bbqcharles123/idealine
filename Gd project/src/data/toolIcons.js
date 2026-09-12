import {
  Eraser, ArrowLeftRight, Scissors, Layers, Combine,
  Copy, ArrowRightLeft, RefreshCw, Lightbulb, Link, GitBranch,
  TrendingUp, TrendingDown, Sparkles, Ban,
} from 'lucide-react'

// tagName별 lucide-react 아이콘 컴포넌트 매핑
//
// [왜 별도 파일로 분리했는가]
// 원래 LayerStackNode.jsx 안의 지역 상수(TAG_ICON)였다. 도구 안내 페이지(ToolGuidePage)가
// 같은 매핑을 필요로 하게 되면서, 두 곳에 복사해 두면 도구를 추가·변경할 때
// 한쪽만 고쳐 어긋날 여지가 생긴다. 그래서 단일 출처로 끌어냈다.
//
// [이 파일이 담는 것 — 식별자 → 아이콘, 그것뿐]
// bccData.js / transformData.js 가 '방향성과 도구의 구조'를 담고,
// toolLayerDesc.js 가 '화면용 설명 문장'을 담는 것과 같은 원칙이다.
// 설명 텍스트나 색을 여기 함께 두지 않는다 — 같은 도구에 대한 정보가 한 벌 더 늘어나면
// 나중에 어느 것이 실제로 쓰이는지 찾을 수 없게 된다.
//
// [키는 도구명과 정확히 같아야 한다]
// bccData.js·transformData.js의 tools[].name / tool.name과 같은 문자열이어야 한다.
// 그 이름이 AI 응답 스키마 enum의 원본이자 카드 data.tagName에 저장되는 값이고,
// 화면은 그 값으로 이 표를 조회한다.
//
// expand의 '제거'(Eraser)와 transform의 '제거'(Ban)는 이름이 같지만 다른 도구다 —
// BCC 제거는 '이 아이디어의 요소'를, ERRC 제거는 '업계 표준'을 없앤다.
// toolType으로 한 단계 감싸 둔 이유가 이것이다.
export const TAG_ICON = {
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
