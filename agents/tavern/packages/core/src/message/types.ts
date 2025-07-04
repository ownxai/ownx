import type { UIMessage as _UIMessage, UIDataTypes, UITools } from 'ai'
import { z } from 'zod/v4'

import type { Message as _Message } from '@ownxai/sdk'
import { messageContentSchema as _messageContentSchema } from '@ownxai/sdk'

export interface MessageMetadata {
  characterId?: string // for 'assistant' role
  personaId?: string // for 'user' role
  personaName?: string // for 'user' role; will be used when the persona is deleted
  modelId?: string // for 'assistant' role & LLM generated message

  summary?: string
}

export const messageMetadataSchema = z
  .object({
    characterId: z.string().optional(),
    personaId: z.string().optional(),
    personaName: z.string().optional(),
    modelId: z.string().optional(),
    summary: z.string().optional(),
  })
  .refine(
    (data) => {
      // Either characterId exists, or personaId and personaName both exist
      const hasCharacter = data.characterId
      const hasPersonaAndName = data.personaId && data.personaName
      return hasCharacter ?? hasPersonaAndName
    },
    {
      message: 'Either characterId must exist, or personaId and personaName must both exist',
    },
  )

export type MessageContent = z.infer<typeof messageContentSchema>

export const messageContentSchema = _messageContentSchema
  .omit({
    metadata: true,
  })
  .extend({
    metadata: messageMetadataSchema,
  })

export type Message = Omit<_Message, 'content'> & {
  content: MessageContent
}

export type UIMessage<
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
> = _UIMessage<MessageMetadata, DATA_PARTS, TOOLS>

export interface MessageNode {
  message: Message
  parent?: MessageNode
  descendants: MessageNode[]
}
