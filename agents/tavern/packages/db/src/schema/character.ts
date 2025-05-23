import type { InferSelectModel } from 'drizzle-orm'
import { index, jsonb, pgEnum, pgTable, text, unique } from 'drizzle-orm/pg-core'
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

export const characterSourceEnumValues = [
  'create', // the character is created by the user
  'import-file', // the character is imported from a file
  'import-url', // the character is imported from a url
  'nft-owned', // the character is nft and owned by the user
  'nft-link', // the character is linked from another character nft
] as const

export const characterSourceEnum = pgEnum('source', characterSourceEnumValues)

export interface CharacterMetadata {
  filename: string // with file extension
  url: string // the url of the file stored in the object storage
  fromUrl?: string // the url of the imported character

  custom?: unknown
}

export const characterMetadataSchema = z.object({
  filename: z.string(),
  url: z.string(),
  fromUrl: z.string().optional(),
  custom: z.unknown().optional(),
})

export const Character = pgTable(
  'character',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateId('char')),
    userId: text()
      .notNull()
      .references(() => User.id, { onDelete: 'cascade' }),
    source: characterSourceEnum().notNull().default('create'),
    // the nft token id of the character (if the character is nft)
    nftId: text(),
    metadata: jsonb().$type<CharacterMetadata>().notNull(),
    ...timestamps,
  },
  (table) => [
    index().on(table.userId, table.source),
    index().on(table.nftId, table.source),
    ...timestampsIndices(table),
  ],
)

export type Character = InferSelectModel<typeof Character>

export const CreateCharacterSchema = createInsertSchema(Character, {
  id: makeIdValid('char').optional(),
  userId: z.string(),
  source: z.enum(characterSourceEnumValues),
  nftId: z.string().optional(),
  metadata: characterMetadataSchema,
}).omit({
  ...timestampsOmits,
})

export const UpdateCharacterSchema = createUpdateSchema(Character, {
  id: z.string(),
  metadata: makeObjectNonempty(characterMetadataSchema),
}).omit({
  userId: true,
  source: true,
  nftId: true,
  ...timestampsOmits,
})

export const CharacterToChat = pgTable(
  'character_to_chat',
  {
    id: text()
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateId('cc')),
    characterId: text()
      .notNull()
      .references(() => Character.id),
    chatId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => User.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    unique().on(table.characterId, table.chatId),
    index().on(table.userId),
    ...timestampsIndices(table),
  ],
)

export type CharacterToChat = InferSelectModel<typeof CharacterToChat>
