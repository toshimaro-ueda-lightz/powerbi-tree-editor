import { describe, expect, it } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { migrate } from "../db/migrate"

// テストごとに一意な一時ファイルDBを作る
function newTmpDb(): string {
	return path.join(
		os.tmpdir(),
		`tree-node-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`,
	)
}

describe("node", () => {
	it("マイグレーション適用後に node テーブルが存在する", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		const row = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'node'",
			)
			.get() as { name: string } | undefined
		expect(row?.name).toBe("node")

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("第1〜3階層の共通ノードは department_id=NULL で挿入できる", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		const info = db
			.prepare(
				"INSERT INTO node (name, subtitle, level, scope, department_id) VALUES (?, ?, ?, ?, ?)",
			)
			.run("共通ノード(第2階層)", "補足説明", 2, "common", null)
		expect(info.changes).toBe(1)

		const row = db
			.prepare("SELECT subtitle FROM node WHERE name = '共通ノード(第2階層)'")
			.get() as { subtitle: string }
		expect(row.subtitle).toBe("補足説明")

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("第4〜6階層で department_id=NULL は拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		expect(() =>
			db
				.prepare(
					"INSERT INTO node (name, level, scope, department_id) VALUES (?, ?, ?, ?)",
				)
				.run("部署ノード(第4階層)", 4, "dept", null),
		).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("level=7 は CHECK 制約で拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		expect(() =>
			db
				.prepare(
					"INSERT INTO node (name, level, scope, department_id) VALUES (?, ?, ?, ?)",
				)
				.run("範囲外ノード", 7, "dept", "D01"),
		).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})
})
