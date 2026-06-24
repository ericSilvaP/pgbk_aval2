import express from 'express'

import { errorHandler } from './errors/error-handler.js'
import { router } from './routes/index.js'

export const app = express()

app.use(express.json())
app.use(router)
app.use(errorHandler)
