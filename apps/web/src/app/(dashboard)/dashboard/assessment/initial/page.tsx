'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TestRunner, type TestRunnerResult } from '@/components/learning/TestRunner'
import { RotateCcw, Map } from 'lucide-react'

export default function InitialAssessmentPage() {
  const router = useRouter()

  const renderActions = (result: TestRunnerResult, helpers: { retry: () => void }) => (
    <>
      <Button variant="outline" onClick={helpers.retry} className="gap-2">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        再測一次
      </Button>
      {result.wrongCount > 0 && (
        <Button variant="outline" onClick={() => router.push('/dashboard/wrong-questions')}>
          複習錯題
        </Button>
      )}
      <Button variant="math" onClick={() => router.push('/dashboard/map')} className="gap-2">
        <Map className="h-4 w-4" aria-hidden="true" />
        去學習地圖
      </Button>
    </>
  )

  return (
    <TestRunner
      queryKey={['assessment', 'initial', 'me']}
      startUrl="/api/assessments/initial"
      submitUrl="/api/learning/level-test/submit"
      backHref="/dashboard"
      backLabel="回首頁"
      heading={
        <div>
          <h1 className="text-3xl font-bold tracking-tight">初始能力測驗</h1>
          <p className="text-muted-foreground mt-1">
            依你的年級跨單元組卷，幫你定位學習起點（結果僅供參考，不影響解鎖）
          </p>
        </div>
      }
      resultTitle={() => '能力測驗完成！'}
      showPassScore={false}
      renderResultActions={renderActions}
    />
  )
}