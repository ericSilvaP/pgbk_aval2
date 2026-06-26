import { env } from './config/env.js'
import { app } from './index.js'

app.listen(env.PORT, () => {
  console.warn(`Server running on port ${String(env.PORT)}`)
})
