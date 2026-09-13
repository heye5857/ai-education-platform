/**
 * Phase 4 課綱種子資料：國一上學期數學（MATH_JH_1）
 * 來源：obsidian-vault/03_Math_Teaching/Math Curriculum.md
 *
 * 冪等設計：可重複執行（upsert course/KP，先清後建 units/levels）
 * 注意：Level 測驗參數（題數/通過分數）為 TBD-03，暫用 Schema 預設值
 */
import { PrismaClient, KnowledgeDomain } from '@prisma/client'

const prisma = new PrismaClient()

interface SeedLevel {
  levelNumber: number
  name: string
  description: string
}

interface SeedUnit {
  code: string
  name: string
  description: string
  levels: SeedLevel[]
}

const LEVEL_ROLES = [
  '基礎概念',
  '進階應用',
  '綜合練習',
  '挑戰題',
] as const

function levels(names: [string, string, string, string], descs: [string, string, string, string]): SeedLevel[] {
  return names.map((name, i) => ({
    levelNumber: i + 1,
    name,
    description: `【${LEVEL_ROLES[i]}】${descs[i]}`,
  }))
}

const UNITS: SeedUnit[] = [
  {
    code: 'INTEGER_OPERATIONS',
    name: '整數與基本運算',
    description: '整數認識、四則運算與混合應用',
    levels: levels(
      ['整數認識與大小比較', '整數加減法', '整數乘除法', '混合運算與應用題'],
      [
        '整數定義、正負數意義與數線大小比較',
        '整數加減法規則與數線操作',
        '整數乘除法規則與符號判斷',
        '四則混合運算順序與生活應用題',
      ]
    ),
  },
  {
    code: 'FACTOR_MULTIPLE',
    name: '因數與倍數',
    description: '因倍數判別、標準分解式與公因倍數應用',
    levels: levels(
      ['因數與倍數認識', '標準分解式', '最大公因數與最小公倍數', '應用綜合練習'],
      [
        '因數倍數定義與判別方法',
        '質因數分解與標準分解式表示法',
        '求最大公因數與最小公倍數的方法',
        '分組分物等生活情境綜合應用',
      ]
    ),
  },
  {
    code: 'LINEAR_EQUATION',
    name: '一元一次方程式',
    description: '等量公理、移項、一元一次方程式求解與應用',
    levels: levels(
      ['等量公理與移項', '一元一次方程式求解', '應用問題列式', '綜合挑戰題'],
      [
        '等量公理意義與移項規則',
        '一元一次方程式的標準解法步驟',
        '將文字題轉為方程式並求解驗算',
        '多步驟綜合題與易錯點辨析',
      ]
    ),
  },
  {
    code: 'PLANE_GEOMETRY',
    name: '幾何基礎：平面圖形',
    description: '點線面角與基本平面圖形性質',
    levels: levels(
      ['點線面與角', '三角形基本性質', '四邊形認識', '幾何綜合應用'],
      [
        '點線面定義、角的種類與度量',
        '三角形內角和與邊角關係',
        '平行四邊形與常見四邊形性質',
        '平面圖形綜合判斷與推理',
      ]
    ),
  },
]

const KNOWLEDGE_POINTS: Array<{
  code: string
  name: string
  description: string
  domain: KnowledgeDomain
  topic: string
  difficulty: number
  prerequisites: string[]
  errorPatterns: string[]
}> = [
  {
    code: 'INTEGER_OPERATION',
    name: '整數運算',
    description: '整數四則運算規則',
    domain: 'NUMBER',
    topic: '整數與基本運算',
    difficulty: 2,
    prerequisites: [],
    errorPatterns: ['SIGN_ERROR', 'ORDER_OF_OPERATIONS_ERROR'],
  },
  {
    code: 'PRIME_FACTORIZATION',
    name: '質因數分解',
    description: '標準分解式表示法',
    domain: 'NUMBER',
    topic: '因數與倍數',
    difficulty: 3,
    prerequisites: ['INTEGER_OPERATION'],
    errorPatterns: ['INCOMPLETE_FACTORIZATION', 'PRIME_MISJUDGMENT'],
  },
  {
    code: 'GCD_LCM',
    name: '最大公因數與最小公倍數',
    description: '公因數公倍數求法與應用',
    domain: 'NUMBER',
    topic: '因數與倍數',
    difficulty: 3,
    prerequisites: ['PRIME_FACTORIZATION'],
    errorPatterns: ['GCD_LCM_CONFUSION'],
  },
  {
    code: 'TRANSPOSITION',
    name: '移項',
    description: '等量公理與移項規則',
    domain: 'ALGEBRA',
    topic: '方程式求解',
    difficulty: 2,
    prerequisites: ['INTEGER_OPERATION'],
    errorPatterns: ['SIGN_ERROR_ON_MOVE', 'EQUATION_BALANCE_ERROR'],
  },
  {
    code: 'LINEAR_EQUATION_SOLVING',
    name: '一元一次方程式求解',
    description: '一元一次方程式標準解法',
    domain: 'ALGEBRA',
    topic: '方程式求解',
    difficulty: 3,
    prerequisites: ['TRANSPOSITION'],
    errorPatterns: ['DISTRIBUTION_ERROR', 'FRACTION_CLEARING_ERROR'],
  },
  {
    code: 'ANGLE_BASICS',
    name: '角的基本認識',
    description: '角的種類、度量與基本性質',
    domain: 'GEOMETRY',
    topic: '平面幾何',
    difficulty: 2,
    prerequisites: [],
    errorPatterns: ['ANGLE_TYPE_CONFUSION', 'UNIT_CONVERSION_ERROR'],
  },
]

async function main() {
  // Course（upsert，冪等）
  const course = await prisma.course.upsert({
    where: { code: 'MATH_JH_1' },
    create: {
      code: 'MATH_JH_1',
      name: '國中數學 7年級上',
      description: '國一上學期數學：整數、因倍數、一元一次方程式、平面幾何基礎',
      gradeLevel: 7,
      semester: 1,
      sortOrder: 1,
      isActive: true,
    },
    update: {
      name: '國中數學 7年級上',
      description: '國一上學期數學：整數、因倍數、一元一次方程式、平面幾何基礎',
      gradeLevel: 7,
      semester: 1,
      isActive: true,
    },
  })
  console.log(`Course: ${course.code} (${course.id})`)

  // Units + Levels（先清後建，保證與規格一致）
  await prisma.unit.deleteMany({ where: { courseId: course.id } })

  let levelCount = 0
  for (const [unitIndex, unit] of UNITS.entries()) {
    const created = await prisma.unit.create({
      data: {
        courseId: course.id,
        code: unit.code,
        name: unit.name,
        description: unit.description,
        sortOrder: unitIndex + 1,
        isActive: true,
        levels: {
          create: unit.levels.map((lv) => ({
            levelNumber: lv.levelNumber,
            name: lv.name,
            description: lv.description,
            isActive: true,
          })),
        },
      },
      include: { levels: true },
    })
    levelCount += created.levels.length
    console.log(`  Unit: ${created.code} - ${created.levels.length} levels`)
  }

  // 第一關示範影片 + 互動卡片（影片 URL 留空表示製作中，頁面會顯示佔位）
  const firstLevel = await prisma.level.findFirst({
    where: { unit: { code: 'INTEGER_OPERATIONS', courseId: course.id }, levelNumber: 1 },
    include: { video: true },
  })
  if (firstLevel) {
    // 用 title 查復用，避免 units 重建後舊 video 變孤兒又重複建立
    let video = await prisma.video.findFirst({
      where: { title: '整數認識與大小比較（製作中）' },
    })
    if (!video) {
      video = await prisma.video.create({
        data: {
          url: '',
          title: '整數認識與大小比較（製作中）',
          description: '第一關教學影片，內容團隊錄製中',
          durationSeconds: 600,
        },
      })
    }
    await prisma.level.update({
      where: { id: firstLevel.id },
      data: { videoId: video.id },
    })
    await prisma.interactiveCard.deleteMany({ where: { videoId: video.id } })
    await prisma.interactiveCard.createMany({
      data: [
        {
          videoId: video.id,
          triggerTimeSeconds: 60,
          type: 'THOUGHT_QUESTION',
          content: {
            question: '想一想：為什麼需要發明負數？你能舉出生活中的例子嗎？',
            hint: '想想溫度計、海拔高度或欠錢的情境',
          },
          sortOrder: 1,
          isRequired: false,
        },
        {
          videoId: video.id,
          triggerTimeSeconds: 300,
          type: 'MINI_PROBLEM',
          content: {
            question: '請計算：(-3) + 5 = ?',
            answer: '2',
            hint: '在數線上從 -3 向右走 5 格',
          },
          sortOrder: 2,
          isRequired: true,
        },
      ],
    })
    console.log(`  Demo video + 2 cards for level: ${firstLevel.name}`)
  }

  // KnowledgePoints（upsert，冪等）
  for (const kp of KNOWLEDGE_POINTS) {
    await prisma.knowledgePoint.upsert({
      where: { code: kp.code },
      create: {
        code: kp.code,
        name: kp.name,
        description: kp.description,
        domain: kp.domain,
        topic: kp.topic,
        difficulty: kp.difficulty,
        prerequisites: kp.prerequisites,
        errorPatterns: kp.errorPatterns,
      },
      update: {
        name: kp.name,
        description: kp.description,
        domain: kp.domain,
        topic: kp.topic,
        difficulty: kp.difficulty,
        prerequisites: kp.prerequisites,
        errorPatterns: kp.errorPatterns,
      },
    })
  }
  console.log(`KnowledgePoints: ${KNOWLEDGE_POINTS.length} upserted`)

  // 示範測驗題（自編 demo，非 225 題原始資料；以 tags.seedDemo 標記，冪等重建）
  const DEMO_TAG = 'g7-integers-v1'
  await prisma.question.deleteMany({
    where: { tags: { path: ['seedDemo'], equals: DEMO_TAG } },
  })

  const demoLevels = await prisma.level.findMany({
    where: { unit: { courseId: course.id } },
    include: { unit: { select: { code: true } } },
  })
  const demoLevelId = (unitCode: string, n: number) =>
    demoLevels.find((l) => l.unit.code === unitCode && l.levelNumber === n)?.id
  const kpId = async (code: string) =>
    (await prisma.knowledgePoint.findUnique({ where: { code } }))?.id

  const integerKp = await kpId('INTEGER_OPERATION')
  const DEMO_QUESTIONS: Array<{
    type: 'SINGLE_CHOICE' | 'FILL_BLANK' | 'SHORT_ANSWER'
    stem: string
    options?: Array<{ id: string; text: string }>
    answer: string
    solutionSteps: string[]
    difficulty: number
    unitCode: string
    levelNumber: number
    kpIds: Array<string | undefined>
  }> = [
    {
      type: 'SINGLE_CHOICE',
      stem: '下列哪一個數最大？',
      options: [
        { id: 'A', text: '-5' },
        { id: 'B', text: '-2' },
        { id: 'C', text: '0' },
        { id: 'D', text: '3' },
      ],
      answer: 'D',
      solutionSteps: ['正數大於 0，0 大於所有負數', '故最大的是 3'],
      difficulty: 1,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 1,
      kpIds: [integerKp],
    },
    {
      type: 'FILL_BLANK',
      stem: '在數線上，-4 的相反數是 ___。',
      answer: '4',
      solutionSteps: ['相反數：與原點等距、方向相反的數', '-4 的相反數為 4'],
      difficulty: 1,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 1,
      kpIds: [integerKp],
    },
    {
      type: 'SINGLE_CHOICE',
      stem: '氣溫 -3°C 比 2°C 低幾度？',
      options: [
        { id: 'A', text: '1 度' },
        { id: 'B', text: '5 度' },
        { id: 'C', text: '-5 度' },
        { id: 'D', text: '6 度' },
      ],
      answer: 'B',
      solutionSteps: ['溫差 = 2 - (-3) = 2 + 3 = 5'],
      difficulty: 2,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 1,
      kpIds: [integerKp],
    },
    {
      type: 'FILL_BLANK',
      stem: '比 -2 大 3 的數是 ___。',
      answer: '1',
      solutionSteps: ['-2 + 3 = 1'],
      difficulty: 2,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 1,
      kpIds: [integerKp],
    },
    {
      type: 'SINGLE_CHOICE',
      stem: '下列敘述何者正確？',
      options: [
        { id: 'A', text: '0 是正整數' },
        { id: 'B', text: '0 是負整數' },
        { id: 'C', text: '0 既不是正整數也不是負整數' },
        { id: 'D', text: '0 是自然數也是正整數' },
      ],
      answer: 'C',
      solutionSteps: ['0 為整數，但不屬於正整數也不屬於負整數'],
      difficulty: 2,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 1,
      kpIds: [integerKp],
    },
    {
      type: 'FILL_BLANK',
      stem: '絕對值 |-7| = ___。',
      answer: '7',
      solutionSteps: ['絕對值表示與原點的距離，恆為非負數'],
      difficulty: 1,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 1,
      kpIds: [integerKp],
    },
    {
      type: 'FILL_BLANK',
      stem: '(-3) + 5 = ___。',
      answer: '2',
      solutionSteps: ['異號相加：取絕對值大者的符號', '5 - 3 = 2'],
      difficulty: 2,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 2,
      kpIds: [integerKp],
    },
    {
      type: 'FILL_BLANK',
      stem: '4 - 9 = ___。',
      answer: '-5',
      solutionSteps: ['4 - 9 = 4 + (-9) = -5'],
      difficulty: 2,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 2,
      kpIds: [integerKp],
    },
    {
      type: 'SINGLE_CHOICE',
      stem: '(-2) + (-6) = ?',
      options: [
        { id: 'A', text: '-8' },
        { id: 'B', text: '8' },
        { id: 'C', text: '4' },
        { id: 'D', text: '-4' },
      ],
      answer: 'A',
      solutionSteps: ['同號相加：符號不變，絕對值相加'],
      difficulty: 2,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 2,
      kpIds: [integerKp],
    },
    {
      type: 'FILL_BLANK',
      stem: '0 - (-5) = ___。',
      answer: '5',
      solutionSteps: ['減去負數等於加上正數：0 + 5 = 5'],
      difficulty: 2,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 2,
      kpIds: [integerKp],
    },
    {
      type: 'SINGLE_CHOICE',
      stem: '下列哪個算式的結果最小？',
      options: [
        { id: 'A', text: '-1 + 2' },
        { id: 'B', text: '-3 + 1' },
        { id: 'C', text: '2 - 5' },
        { id: 'D', text: '0 - 1' },
      ],
      answer: 'C',
      solutionSteps: ['A=1，B=-2，C=-3，D=-1，最小的是 -3'],
      difficulty: 3,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 2,
      kpIds: [integerKp],
    },
    {
      type: 'SHORT_ANSWER',
      stem: '小明有 50 元，買了 65 元的文具，還差多少元？（填數字即可）',
      answer: '15',
      solutionSteps: ['65 - 50 = 15，還差 15 元'],
      difficulty: 2,
      unitCode: 'INTEGER_OPERATIONS',
      levelNumber: 2,
      kpIds: [integerKp],
    },
  ]

  let demoCount = 0
  for (const q of DEMO_QUESTIONS) {
    const levelId = demoLevelId(q.unitCode, q.levelNumber)
    if (!levelId) continue
    const created = await prisma.question.create({
      data: {
        type: q.type,
        stem: q.stem,
        options: q.options ?? undefined,
        answer: q.answer,
        solutionSteps: q.solutionSteps,
        difficulty: q.difficulty,
        source: 'GENERATED',
        gradeLevel: 7,
        tags: { seedDemo: DEMO_TAG },
      },
    })
    await prisma.levelQuestion.create({
      data: { levelId, questionId: created.id, sortOrder: demoCount },
    })
    for (const kp of q.kpIds) {
      if (!kp) continue
      await prisma.questionKnowledgePoint.create({
        data: { questionId: created.id, knowledgePointId: kp, weight: 1.0 },
      })
    }
    demoCount++
  }
  console.log(`Demo questions: ${demoCount} created (levels 1-2)`)

  console.log(`\n✅ Seed 完成：1 course / ${UNITS.length} units / ${levelCount} levels / ${KNOWLEDGE_POINTS.length} KPs / ${demoCount} demo questions`)
}

main()
  .catch((e) => {
    console.error('Seed 失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
