import { exec } from 'child_process'
import { URL } from 'url'

export const downloadFile = (url: URL, dest: string) => {
  return new Promise((resolve, reject) => {
    const wget = `wget --continue -O "${dest}" "${url}"`

    exec(wget, (err, stdout, stderr) => {
      if (err) {
        if (stderr) console.error(stderr)
        reject(err)
      }

      resolve(stdout)
    })
  })
}
