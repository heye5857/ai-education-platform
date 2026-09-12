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

  console.log(`\n✅ Seed 完成：1 course / ${UNITS.length} units / ${levelCount} levels / ${KNOWLEDGE_POINTS.length} KPs`)
}

main()
  .catch((e) => {
    console.error('Seed 失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
