import { exec } from 'child_process'
import { Url } from 'url'

export const downloadFile = (url: Url, dest: string) => {
  return new Promise((resolve, reject) => {
    const wget = `wget -O "${dest}" "${url.href}"`

    exec(wget, err => {
      if (err) {
        reject(err)
      }

      resolve()
    })
  })
}
