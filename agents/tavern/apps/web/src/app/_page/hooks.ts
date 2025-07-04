import type { UseChatHelpers } from '@ai-sdk/react'
import type { UIMessage } from '@tavern/core'
import { useEffect, useLayoutEffect, useState } from 'react'

type Status = UseChatHelpers<UIMessage>['status']

export function useCallWhenGenerating(
  chatId: string | undefined,
  status: Status,
  func: (status: Status) => void,
) {
  const [lastStatus, setLastStatus] = useState<Status>()
  useEffect(() => {
    setLastStatus(undefined)
  }, [chatId])

  useLayoutEffect(() => {
    if (status !== lastStatus || status === 'submitted' || status === 'streaming') {
      setLastStatus(status)
      func(status)
    }
  }, [status, lastStatus, func])
}
