import Database from "better-sqlite3"
import fs from "node:fs"
import path from "node:path"

const ROOT = path.join(import.meta.dirname, "..")
const MIGRATIONS_DIR = path.join(import.meta.dirname, "migrations")
const SEEDS_DIR = path.join(import.meta.dirname, "seeds")
const DEFAULT_DB_PATH = path.join(ROOT, "data", "tree.sqlite")

export function migrate(dbPath: string = DEFAULT_DB_PATH): Database.Database {
	// data/ フォルダがなければ作る（クローン直後でも動くように）
	fs.mkdirSync(path.dirname(dbPath), { recursive: true })

	const db = new Database(dbPath)
	db.pragma("journal_mode = WAL")
	db.pragma("foreign_keys = ON")

	// 適用済みマイグレーションの記録テーブル
	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename   TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`)

	const applied = new Set(
		db
			.prepare("SELECT filename FROM schema_migrations")
			.all()
			.map((row: any) => row.filename),
	)

	// 未適用の連番SQLを順に適用（1本＝1トランザクション）
	const files = fs
		.readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith(".sql"))
		.sort()

	for (const file of files) {
		if (applied.has(file)) continue
		const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8")
		db.transaction(() => {
			db.exec(sql)
			db.prepare("INSERT INTO schema_migrations (filename) VALUES (?)").run(file)
		})()
		console.log(`applied: ${file}`)
	}

	// シードは冪等に書き、毎回流す
	if (fs.existsSync(SEEDS_DIR)) {
		const seeds = fs
			.readdirSync(SEEDS_DIR)
			.filter((f) => f.endsWith(".sql"))
			.sort()
		for (const file of seeds) {
			db.exec(fs.readFileSync(path.join(SEEDS_DIR, file), "utf8"))
			console.log(`seeded: ${file}`)
		}
	}

	return db
}