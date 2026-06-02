import postgres from 'postgres'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

export default sql
