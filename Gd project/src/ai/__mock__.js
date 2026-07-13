// VITE_USE_AI_MOCK=true 일 때 사용하는 mock 응답 데이터
// 실제 API 스키마와 동일한 구조를 유지해야 UI 컴포넌트가 정상 렌더링됨

// ── 공통 UX 평가 mock ────────────────────────────────────────
export const MOCK_UX_DATA = {
  summary:
    '아이디어 자체는 사용자의 일상적 불편을 효과적으로 해소하며 창의성과 실현 가능성이 균형 잡혀 있습니다. 사용자 경험 측면에서도 직관적인 인터페이스와 높은 효율성이 기대됩니다. 사회적 영향력은 제한적이나 개인 영역에서의 가치는 충분합니다.',
  areas: [
    {
      key: 'business',
      name: 'Business',
      status: 'satisfied',
      evaluation: '창의적인 접근 방식과 기술적 실현 가능성이 모두 갖춰져 있습니다.',
      criteria: [
        { name: '창의성', needsImprovement: false },
        { name: '실현 가능성', needsImprovement: false },
      ],
    },
    {
      key: 'human',
      name: 'Human',
      status: 'supplement',
      evaluation: '사용 기대성과 매력성은 높지만 효율 기대성 측면에서 보완이 필요합니다.',
      criteria: [
        { name: '사용 기대성', needsImprovement: false },
        { name: '효율 기대성', needsImprovement: true },
        { name: '명료성', needsImprovement: false },
        { name: '매력성', needsImprovement: false },
      ],
    },
    {
      key: 'social',
      name: 'Social',
      status: 'satisfied',
      evaluation: '개인과 소규모 집단에 긍정적인 영향을 미칩니다.',
      criteria: [
        { name: '사회적 도움성', needsImprovement: false },
      ],
    },
  ],
  evaluationItems: [
    { name: '창의성',      needsImprovement: false, evaluation: '기존 서비스와 차별화된 접근 방식이 돋보입니다.' },
    { name: '실현 가능성', needsImprovement: false, evaluation: '현재 기술 수준에서 충분히 구현 가능한 아이디어입니다.' },
    { name: '사용 기대성', needsImprovement: false, evaluation: '사용자가 직관적으로 서비스를 이해하고 활용할 수 있을 것입니다.' },
    { name: '효율 기대성', needsImprovement: true,  evaluation: '핵심 기능의 응답 속도와 처리 효율에 대한 추가 고려가 필요합니다.' },
    { name: '명료성',      needsImprovement: false, evaluation: '서비스의 목적과 사용 방법이 명확하게 전달됩니다.' },
    { name: '매력성',      needsImprovement: false, evaluation: '비주얼 디자인과 인터랙션이 사용자의 관심을 끌기에 충분합니다.' },
    { name: '사회적 도움성', needsImprovement: false, evaluation: '개인의 삶의 질 향상에 기여하는 가치 있는 서비스입니다.' },
  ],
}

// ── UX 평가 전용 mock ────────────────────────────────────────
// generateUxEval(title, description) → uxData
export function mockUxData() {
  return MOCK_UX_DATA
}

// ── 호출 1: 씨드카드 본문 생성 ───────────────────────────────
// generateSeedContent(topic) → { title, description }  (uxData는 mockUxData로 분리)
export function mockSeedContent(topic) {
  return {
    title: `[MOCK] ${topic} 기반 스마트 루틴 추천 앱`,
    description:
      `바쁜 현대인을 위해 ${topic} 관련 데이터를 분석하여 개인화된 일상 루틴을 자동으로 구성해주는 서비스입니다. ` +
      '사용자의 패턴을 학습하여 최적의 시간대에 맞춤형 활동을 제안하고, ' +
      '지속적인 피드백으로 루틴을 개선해 나갑니다.',
  }
}

// ── 호출 2: 도구별 예시 생성 ─────────────────────────────────
// generateToolExamples(cardDescription, direction) → [{ name, example }]
export function mockToolExamples(direction) {
  return direction.toolNames.map((name) => ({
    name,
    example: `[MOCK] '${name}' 도구를 적용하면 기존 기능에서 핵심 요소를 재구성하여 새로운 사용자 경험을 만들어낼 수 있습니다.`,
  }))
}

// ── 호출 3·4: 질문 생성 ──────────────────────────────────────
// generateQuestion(...) → { question }
export function mockQuestion(toolName) {
  return {
    question: `[MOCK] '${toolName}' 도구를 이 아이디어에 적용한다면, 어떤 요소를 어떻게 바꾸고 싶으신가요?`,
  }
}

// ── 호출 5: 파생카드 본문 생성 ───────────────────────────────
// generateDerivedContent(...) → { title, description, highlightPhrases }  (uxData는 mockUxData로 분리)
export function mockDerivedContent(toolName, answer) {
  return {
    title: `[MOCK] ${toolName} 적용 아이디어`,
    description:
      `'${toolName}' 도구를 통해 기존 아이디어의 핵심 요소를 발전시킨 결과입니다. ` +
      '사용자의 입력을 바탕으로 더욱 구체화된 기능과 경험을 제공하며, ' +
      '새로운 관점에서 문제를 해결하는 방향으로 아이디어가 확장되었습니다.',
    highlightPhrases: answer ? [answer.slice(0, Math.min(20, answer.length))] : [],
  }
}

// ── 호출 6: 직접작성 카드 본문 생성 ──────────────────────────
// generateWriteContent(title, description) → { writeRec, writeExpect, writeRecReason }  (uxData는 mockUxData로 분리)
export function mockWriteContent() {
  return {
    writeRec: 'expand',
    writeExpect:
      '[MOCK] 확장하기 도구를 활용하면 현재 아이디어의 구조를 재배치하여 더 풍부한 사용자 경험을 만들어낼 수 있습니다.',
    writeRecReason:
      '[MOCK] 이 아이디어는 이미 핵심 개념이 잘 잡혀 있어, 요소 간 관계를 재구성하는 확장하기 접근이 더 효과적입니다.',
  }
}
