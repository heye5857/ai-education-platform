/**
 * 題庫 JSON 匯入管線（Phase 5）
 *
 * 用法：
 *   DATABASE_URL=... pnpm --filter=@ai-edu/web exec tsx scripts/import-questions.ts <file.json>
 *
 * JSON 格式：
 * {
 *   "questions": [
 *     {
 *       "id": "可選，提供則按 id upsert，否則新增",
 *       "type": "SINGLE_CHOICE | MULTIPLE_CHOICE | FILL_BLANK | SHORT_ANSWER",
 *       "stem": "題幹",
 *       "options": [{ "id": "A", "text": "選項文字" }],
 *       "answer": "正解（單選填選項 id；填充填文字，多選填 JSON 陣列字串）",
 *       "solutionSteps": ["解析步驟"],
 *       "difficulty": 1-5,
 *       "source": "TEXTBOOK | EXAM | WORKBOOK | TEACHER | GENERATED",
 *       "gradeLevel": 7,
 *       "tags": { "任意標籤": "..." },
 *       "knowledgePoints": ["KP_CODE"],
 *       "levels": [{ "unitCode": "INTEGER_OPERATIONS", "levelNumber": 1 }]
 *     }
 *   ]
 * }
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const optionSchema = z.object({ id: z.string(), text: z.string() })

const importQuestionSchema = z.object({
  id: z.string().cuid().optional(),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'FILL_BLANK', 'SHORT_ANSWER']),
  stem: z.string().min(1, '題幹不可為空'),
  options: z.array(optionSchema).optional(),
  answer: z.string().min(1, '答案不可為空'),
  solutionSteps: z.array(z.string()).default([]),
  difficulty: z.number().int().min(1).max(5).default(3),
  source: z.enum(['TEXTBOOK', 'EXAM', 'WORKBOOK', 'TEACHER', 'GENERATED']).default('TEACHER'),
  gradeLevel: z.number().int().min(1).max(12),
  tags: z.record(z.unknown()).default({}),
  knowledgePoints: z.array(z.string()).default([]),
  levels: z
    .array(z.object({ unitCode: z.string(), levelNumber: z.number().int().positive() }))
    .default([]),
})

const importFileSchema = z.object({ questions: z.array(importQuestionSchema).min(1) })

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('用法：tsx scripts/import-questions.ts <file.json>')
    process.exit(1)
  }

  const raw = await readFile(resolve(process.cwd(), file), 'utf-8').catch(() => null)
  if (!raw) {
    console.error(`讀取失敗：${file}`)
    process.exit(1)
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    console.error('JSON 解析失敗')
    process.exit(1)
  }

  const parsed = importFileSchema.safeParse(json)
  if (!parsed.success) {
    console.error('格式驗證失敗：')
    console.error(JSON.stringify(parsed.error.flatten(), null, 2))
    process.exit(1)
  }

  const prisma = new PrismaClient()
  let created = 0
  let updated = 0
  let skipped = 0
  const warnings: string[] = []

  try {
    for (const [index, item] of parsed.data.questions.entries()) {
      const label = `第 ${index + 1} 題`

      // 解析 KP 代碼（未知代碼警告並跳過連結，不擋整題）
      const kpIds: string[] = []
      for (const code of item.knowledgePoints) {
        const kp = await prisma.knowledgePoint.findUnique({ where: { code } })
        if (!kp) {
          warnings.push(`${label}：未知 KP 代碼 ${code}，已跳過此連結`)
          continue
        }
        kpIds.push(kp.id)
      }

      // 解析關卡（unitCode + levelNumber）
      const levelIds: string[] = []
      for (const lv of item.levels) {
        const level = await prisma.level.findFirst({
          where: { levelNumber: lv.levelNumber, unit: { code: lv.unitCode } },
          select: { id: true },
        })
        if (!level) {
          warnings.push(`${label}：找不到關卡 ${lv.unitCode}#${lv.levelNumber}，已跳過此連結`)
          continue
        }
        levelIds.push(level.id)
      }

      let questionId: string
      if (item.id) {
        const existing = await prisma.question.findUnique({ where: { id: item.id } })
        if (existing) {
          await prisma.question.update({
            where: { id: item.id },
            data: {
              type: item.type,
              stem: item.stem,
              options: item.options ?? undefined,
              answer: item.answer,
              solutionSteps: item.solutionSteps,
              difficulty: item.difficulty,
              source: item.source,
              gradeLevel: item.gradeLevel,
              tags: item.tags as Record<string, unknown> as never,
            },
          })
          questionId = item.id
          updated++
        } else {
          const createdQ = await prisma.question.create({
            data: {
              id: item.id,
              type: item.type,
              stem: item.stem,
              options: item.options ?? undefined,
              answer: item.answer,
              solutionSteps: item.solutionSteps,
              difficulty: item.difficulty,
              source: item.source,
              gradeLevel: item.gradeLevel,
              tags: item.tags as Record<string, unknown> as never,
            },
          })
          questionId = createdQ.id
          created++
        }
      } else {
        const createdQ = await prisma.question.create({
          data: {
            type: item.type,
            stem: item.stem,
            options: item.options ?? undefined,
            answer: item.answer,
            solutionSteps: item.solutionSteps,
            difficulty: item.difficulty,
            source: item.source,
            gradeLevel: item.gradeLevel,
            tags: item.tags as Record<string, unknown> as never,
          },
        })
        questionId = createdQ.id
        created++
      }

      for (const kpId of kpIds) {
        await prisma.questionKnowledgePoint.upsert({
          where: { questionId_knowledgePointId: { questionId, knowledgePointId: kpId } },
          create: { questionId, knowledgePointId: kpId, weight: 1.0 },
          update: {},
        })
      }
      for (const levelId of levelIds) {
        const link = await prisma.levelQuestion.findFirst({ where: { levelId, questionId } })
        if (!link) {
          await prisma.levelQuestion.create({ data: { levelId, questionId, sortOrder: 0 } })
        }
      }
    }
  } finally {
    await prisma.$disconnect()
  }

  console.log(`\n✅ 匯入完成：新增 ${created} 題 / 更新 ${updated} 題 / 跳過 0 題`)
  if (skipped > 0) console.log(`跳過：${skipped}`)
  for (const w of warnings) console.warn(`⚠️  ${w}`)
}

main().catch((e) => {
  console.error('匯入失敗:', e)
  process.exit(1)
})
