# Lucide React 아이콘 사용 목록

> `idealine/Gd project/src` 기준 전체 파일에서 사용 중인 lucide-react 아이콘 정리

---

## LayerStackNode.jsx

도구 레이어 확장/변형 tagName별 아이콘 + peek 접기 트리거 아이콘

### 확장하기 (expand) 도구 아이콘

| 아이콘 이름 | tagName | 설명 |
|---|---|---|
| `Eraser` | 제거 | 지우개 |
| `ArrowLeftRight` | 대체 | 양방향 화살표 |
| `Scissors` | 분할·분리 | 가위 |
| `Layers` | 용도통합 | 레이어 |
| `Combine` | 결합 | 합치기 |
| `Copy` | 복제 | 복사 |
| `ArrowRightLeft` | 역전 | 좌우 화살표 교차 |
| `RefreshCw` | 재정의 | 시계방향 새로고침 |
| `Lightbulb` | 유추 | 전구 |
| `Link` | 연결 | 링크 |
| `GitBranch` | 속성 의존성 | 브랜치 |

### 변형하기 (transform) 도구 아이콘

| 아이콘 이름 | tagName | 설명 |
|---|---|---|
| `TrendingUp` | 증가 | 상승 그래프 |
| `TrendingDown` | 감소 | 하강 그래프 |
| `Sparkles` | 창출 | 반짝임 |
| `Ban` | 제거 | 금지 원 |

### 기타

| 아이콘 이름 | 사용 위치 | 설명 |
|---|---|---|
| `ArrowUp` | 펼침 상태 peek 스트립 오른쪽 | 도구 레이어 접기 트리거 |

---

## 사이드패널 컴포넌트

| 아이콘 이름 | 파일 | 사용 위치 | 설명 |
|---|---|---|---|
| `Lightbulb` | `panel/InputTopic.jsx` | 입력 주제 박스 좌측 아이콘 | 전구 (씨드카드 전용) |
| `MoveUpRight` | `panel/IdeaSource.jsx` | 아이디어 출처 부모카드 이동 버튼 | 우상단 화살표 |
| `ChevronUp` | `panel/UxAreaAccordion.jsx` | UX 평가 아코디언 펼침 상태 헤더 | 위쪽 꺽쇠 |
| `ChevronDown` | `panel/UxAreaAccordion.jsx` | UX 평가 아코디언 접힘 상태 헤더 | 아래쪽 꺽쇠 |
| `CircleAlert` | `panel/UxCriterionTag.jsx` | 보완 필요 UX 평가요소 태그 내 경고 아이콘 | 원형 경고 |

---

## 전체 요약

| 아이콘 이름 | 사용 파일 | 렌더링 조건 |
|---|---|---|
| `Lightbulb` | `panel/InputTopic.jsx` | 씨드카드 사이드패널에서 항상 표시 |
| `Lightbulb` | `LayerStackNode.jsx` | tagName이 `'유추'`인 expand 카드가 있을 때만 표시 |
| 나머지 19개 | 각 1개 파일 | — |

**총 20개** 아이콘 사용 (Lightbulb는 2곳에 존재하나 LayerStackNode에서는 조건부 렌더링)
