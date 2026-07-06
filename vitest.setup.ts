import 'dotenv/config'

// dotenv will automatically load .env, .env.test when Vitest runs in test mode.
// Explicitly ensure .env.test is loaded if present.
import { config } from 'dotenv'
config({ path: './.env.test', override: false })
