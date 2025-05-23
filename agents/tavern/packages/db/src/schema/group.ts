import type { InferSelectModel } from 'drizzle-orm'
import { index, jsonb, pgTable, text, unique } from 'drizzle-orm/pg-core'
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod'
import { z } from 'zod'

import {
  generateId,
  makeIdValid,
  makeObjectNonempty,
  timestamps,
  timestampsIndices,
  timestampsOmits,
} from '@ownxai/sdk'

import { User } from '.'

export interface GroupMetadata {
  custom?: unknown
}

export const groupMetadataSchema = z.object({
  custom: z.unknown().optional(),
})

export const Group = pgTable(
  'group',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateId('group')),
    userId: text()
      .notNull()
      .references(() => User.id, { onDelete: 'cascade' }),
    characters: jsonb().$type<string[]>().notNull(), // Array of character references
    metadata: jsonb().$type<GroupMetadata>().notNull(),
    ...timestamps,
  },
  (table) => [
    index().on(table.userId),
    ...timestampsIndices(table),
  ],
)

export type Group = InferSelectModel<typeof Group>

export const CreateGroupSchema = createInsertSchema(Group, {
  id: makeIdValid('group').optional(),
  userId: z.string(),
  characters: z.array(z.string()).min(1),
  metadata: groupMetadataSchema,
}).omit({
  ...timestampsOmits,
})

export const UpdateGroupSchema = createUpdateSchema(Group, {
  id: z.string(),
  characters: z.array(z.any()).optional(),
  metadata: makeObjectNonempty(groupMetadataSchema).optional(),
}).omit({
  userId: true,
  ...timestampsOmits,
})

export const GroupToChat = pgTable(
  'group_to_chat',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateId('gc')),
    groupId: text()
      .notNull()
      .references(() => Group.id),
    chatId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => User.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    unique().on(table.groupId, table.chatId),
    index().on(table.userId),
    ...timestampsIndices(table),
  ],
)

export type GroupToChat = InferSelectModel<typeof GroupToChat>
