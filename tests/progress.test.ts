import { describe, expect, it } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type Database from "better-sqlite3"
import { migrate } from "../db/migrate"

// テストごとに一意な一時ファイルDBを作る
function newTmpDb(): string {
	return path.join(
		os.tmpdir(),
		`tree-progress-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`,
	)
}

// 進捗を紐づける末端ノードを1つ用意し、その node_id を返す
function seedLeafNode(db: Database.Database): number {
	const info = db
		.prepare(
			"INSERT INTO node (name, level, scope, department_id) VALUES (?, ?, ?, ?)",
		)
		.run("末端ノード(第5階層)", 5, "dept", "D04")
	return Number(info.lastInsertRowid)
}

describe("progress_input", () => {
	it("マイグレーション適用後に progress_input テーブルが存在する", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		const row = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'progress_input'",
			)
			.get() as { name: string } | undefined
		expect(row?.name).toBe("progress_input")

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("作業進捗・成果進捗を正常に挿入できる", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)
		const nodeId = seedLeafNode(db)

		const info = db
			.prepare(
				"INSERT INTO progress_input (node_id, as_of_date, work_progress, outcome_progress) VALUES (?, ?, ?, ?)",
			)
			.run(nodeId, "2026-06-19", 0.6, 0.2)
		expect(info.changes).toBe(1)

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("progress が範囲外(1.5) だと CHECK 制約で拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)
		const nodeId = seedLeafNode(db)

		expect(() =>
			db
				.prepare(
					"INSERT INTO progress_input (node_id, as_of_date, work_progress, outcome_progress) VALUES (?, ?, ?, ?)",
				)
				.run(nodeId, "2026-06-19", 1.5, 0),
		).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("存在しない node_id への FK 違反は拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		expect(() =>
			db
				.prepare(
					"INSERT INTO progress_input (node_id, as_of_date, work_progress, outcome_progress) VALUES (?, ?, ?, ?)",
				)
				.run(999999, "2026-06-19", 0.5, 0.5),
		).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("同一 node_id・同一 as_of_date の重複は UNIQUE 制約で拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)
		const nodeId = seedLeafNode(db)

		const insert = db.prepare(
			"INSERT INTO progress_input (node_id, as_of_date, work_progress, outcome_progress) VALUES (?, ?, ?, ?)",
		)
		insert.run(nodeId, "2026-06-19", 0.3, 0.1)
		expect(() => insert.run(nodeId, "2026-06-19", 0.4, 0.2)).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})
})
