import { parentPort, workerData } from 'worker_threads'

import {
  ArticleWorkerData,
  MessageRequestTypes,
  MessageResponseTypes
} from './domain'
import { processArticle } from './process-article'
import { assertNever } from './utils/assert-never'

if (!parentPort) {
  throw new Error('Error loading worker - no parent port')
}

parentPort.on('message', async message => {
  if (!parentPort) {
    throw new Error('Error loading worker - no parent port')
  }

  const { options, directories } = workerData as ArticleWorkerData

  const messageType: MessageRequestTypes = message.type

  switch (messageType) {
    case MessageRequestTypes.EXIT:
      parentPort.close()
      return
    case MessageRequestTypes.PROCESS_ARTICLES:
      if (!message.articles) {
        throw new Error('PROCESS_ARTICLES requires an articles property')
      }

      for (const articlePath of message.articles) {
        processArticle(articlePath, directories, options)
      }

      parentPort.postMessage({
        type: MessageResponseTypes.PROCESSED_ARTICLES,
        processed: message.articles.length
      })
      break
    default:
      assertNever(messageType)
  }
})

parentPort.postMessage({ type: MessageResponseTypes.READY })
