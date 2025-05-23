import type { CharacterCardV3 } from '@risuai/ccardlib'
import { CCardLib } from '@risuai/ccardlib'
import sanitize from 'sanitize-filename'
import { unzip } from 'unzipit'

import { pngRead, pngWrite } from './png-chunks'

export interface ImportFileResult {
  bytes: Uint8Array
  filename: string
}

export async function importFile(
  file: File,
  defaultPngBytes: Uint8Array,
): Promise<ImportFileResult | undefined> {
  switch (file.type) {
    case 'png':
      return await importPng(file)
    case 'json':
      return await importJson(file, defaultPngBytes)
    case 'charx':
      return await importCharx(file, defaultPngBytes)
    default:
      return
  }
}

async function importPng(file: File) {
  const bytes = await file.bytes()
  const version = CCardLib.character.check(JSON.parse(pngRead(bytes)))
  if (version === 'unknown') {
    return
  }
  return {
    bytes,
    filename: file.name,
  }
}

async function importJson(file: File, defaultPngBytes: Uint8Array) {
  const data = await file.text()
  const version = CCardLib.character.check(JSON.parse(data))
  if (version === 'unknown') {
    return
  }

  return {
    bytes: pngWrite(defaultPngBytes, data),
    filename: file.name.replace('.json', '.png'),
  }
}

async function importCharx(file: File, defaultPngBytes: Uint8Array) {
  const entries = Object.entries((await unzip(file)).entries)

  const findEntry = (name: string) => entries.find(([key]) => key.endsWith(name))?.[1]

  const card = await findEntry('card.json')?.json()
  if (!card) {
    return
  }

  const version = CCardLib.character.check(card)
  if (version === 'unknown') {
    return
  }

  const filename = `${sanitize(card.name)}.png`

  if (version === 'v3') {
    const assets = (card as CharacterCardV3).data.assets ?? []
    for (const asset of assets.filter((x) => x.type === 'icon' && x.ext === 'png')) {
      const pathNoProtocol = String(asset.uri.replace(/^(?:\/\/|[^/]+)*\//, ''))
      const avatar = await (await findEntry(pathNoProtocol)?.blob())?.bytes()
      if (avatar) {
        return {
          bytes: avatar,
          filename,
        }
      }
    }
  }

  return {
    bytes: pngWrite(defaultPngBytes, JSON.stringify(card)),
    filename,
  }
}
