import { workerData, parentPort } from 'worker_threads'
import {
  MessageRequestTypes,
  MessageResponseTypes,
  ArticleWorkerData
} from './domain'
import { assertNever } from './utils/assert-never'
import { processArticle } from './process-article'

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
