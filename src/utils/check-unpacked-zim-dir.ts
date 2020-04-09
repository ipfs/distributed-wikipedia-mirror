import { existsSync, lstatSync } from 'fs'

export const checkUnpackedZimDir = (unpackedZimDir: string) => {
  if (!existsSync(unpackedZimDir)) {
    throw new Error(`Unpacked Zim Directory does not exist: ${unpackedZimDir}`)
  }

  if (!lstatSync(unpackedZimDir).isDirectory()) {
    throw new Error(`Unpacked Zim Directory must be a directory`)
  }
}
