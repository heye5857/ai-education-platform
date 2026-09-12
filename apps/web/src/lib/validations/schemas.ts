import { z } from 'zod'

// Auth schemas
export const emailSchema = z.string().email('請輸入有效的電子郵件')
export const passwordSchema = z
  .string()
  .min(8, '密碼至少需要 8 個字元')
  .regex(/[A-Z]/, '密碼需包含至少一個大寫字母')
  .regex(/[a-z]/, '密碼需包含至少一個小寫字母')
  .regex(/[0-9]/, '密碼需包含至少一個數字')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '請輸入密碼'),
  rememberMe: z.boolean().optional(),
})

export const registerSchema = loginSchema
  .extend({
    name: z.string().min(2, '姓名至少需要 2 個字元').max(50, '姓名不能超過 50 個字元'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '兩次輸入的密碼不一致',
    path: ['confirmPassword'],
  })

// Student profile schemas
export const gradeSchema = z.number().int().min(7).max(12, '年級需在 國1 到 高3 之間')
export const classNameSchema = z.string().max(20, '班級名稱不能超過 20 個字元').optional()
export const schoolSchema = z.string().max(100, '學校名稱不能超過 100 個字元').optional()

export const studentProfileSchema = z.object({
  name: z.string().min(2, '姓名至少需要 2 個字元').max(50, '姓名不能超過 50 個字元'),
  school: schoolSchema,
  grade: gradeSchema,
  className: classNameSchema,
  semester: z.number().int().min(1).max(2),
})

export const studentProfileUpdateSchema = studentProfileSchema.partial()

// Onboarding schemas
export const onboardingSchema = z.object({
  name: z.string().min(2, '姓名至少需要 2 個字元').max(50, '姓名不能超過 50 個字元'),
  school: schoolSchema,
  grade: gradeSchema,
  className: classNameSchema,
  semester: z.number().int().min(1).max(2),
  agreedToTerms: z.boolean().refine((val) => val === true, { message: '請同意服務條款' }),
  agreedToPrivacy: z.boolean().refine((val) => val === true, { message: '請同意隱私權政策' }),
})

// Assessment schemas
export const assessmentAnswerSchema = z.object({
  questionId: z.string().cuid('無效的題目 ID'),
  answer: z.string().min(1, '請輸入答案'),
  timeSpentSeconds: z.number().int().positive('答題時間必須大於 0'),
  hintsUsed: z.number().int().min(0).default(0),
})

export const assessmentSubmitSchema = z.object({
  assessmentId: z.string().cuid('無效的測驗 ID'),
  answers: z.array(assessmentAnswerSchema).min(1, '至少需要一個答案'),
  timeSpentSeconds: z.number().int().positive('總答題時間必須大於 0'),
})

// Level test schemas
export const levelTestStartSchema = z.object({
  levelId: z.string().cuid('無效的 Level ID'),
})

// AI Chat schemas
export const aiMessageSchema = z.object({
  conversationId: z.string().cuid().optional(),
  content: z.string().min(1, '訊息不能為空').max(5000, '訊息不能超過 5000 個字元'),
  metadata: z.record(z.unknown()).optional(),
})

export const createConversationSchema = z.object({
  title: z.string().max(100, '標題不能超過 100 個字元').optional(),
})

// Wrong question review schemas
export const wrongQuestionReviewSchema = z.object({
  questionId: z.string().cuid('無效的題目 ID'),
  reviewStatus: z.enum(['NEW', 'REVIEWING', 'MASTERED', 'ARCHIVED']),
})

// Common validation helpers
export const positiveIntSchema = z.number().int().positive('必須為正整數')
export const nonNegativeIntSchema = z.number().int().min(0, '必須為非負整數')
export const percentageSchema = z.number().min(0).max(100, '百分比需在 0-100 之間')
export const urlSchema = z.string().url('請輸入有效的網址').optional().or(z.literal(''))
export const uuidSchema = z.string().uuid('無效的 UUID 格式')
export const cuidSchema = z.string().cuid('無效的 CUID 格式')

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: '請選擇檔案' }),
  maxSize: z.number().positive().default(10 * 1024 * 1024), // 10MB default
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
})

// Type exports
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type StudentProfileInput = z.infer<typeof studentProfileSchema>
export type StudentProfileUpdateInput = z.infer<typeof studentProfileUpdateSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
export type AssessmentAnswerInput = z.infer<typeof assessmentAnswerSchema>
export type AssessmentSubmitInput = z.infer<typeof assessmentSubmitSchema>
export type LevelTestStartInput = z.infer<typeof levelTestStartSchema>
export type AIMessageInput = z.infer<typeof aiMessageSchema>
export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type WrongQuestionReviewInput = z.infer<typeof wrongQuestionReviewSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type DateRangeInput = z.infer<typeof dateRangeSchema>