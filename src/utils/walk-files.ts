import { readdir } from 'fs'
import { resolve } from 'path'
import { promisify } from 'util'

const readdirAsync = promisify(readdir)

export default async function* walkFiles(
  dir: string
): AsyncGenerator<string, any, any> {
  const dirents = await readdirAsync(dir, { withFileTypes: true })
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      yield* walkFiles(res)
    } else {
      yield res
    }
  }
}
