'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TestRunner, type TestRunnerResult } from '@/components/learning/TestRunner'
import { RotateCcw } from 'lucide-react'

export default function LevelTestPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const levelId = params.id

  const renderActions = (result: TestRunnerResult, helpers: { retry: () => void }) => (
    <>
      <Button variant="outline" onClick={helpers.retry} className="gap-2">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        再考一次
      </Button>
      {result.wrongCount > 0 && (
        <Button variant="outline" onClick={() => router.push('/dashboard/wrong-questions')}>
          複習錯題
        </Button>
      )}
      {result.passed && result.nextLevelId && (
        <Button variant="math" onClick={() => router.push(`/dashboard/levels/${result.nextLevelId}`)}>
          前往下一關 →
        </Button>
      )}
      {!result.passed && (
        <Button variant="outline" onClick={() => router.push(`/dashboard/levels/${levelId}`)}>
          回關卡複習
        </Button>
      )}
    </>
  )

  return (
    <TestRunner
      queryKey={['learning', 'level-test', levelId]}
      startUrl={`/api/learning/level-test?levelId=${encodeURIComponent(levelId)}`}
      submitUrl="/api/learning/level-test/submit"
      backHref={`/dashboard/levels/${levelId}`}
      backLabel="回關卡"
      renderResultActions={renderActions}
    />
  )
}