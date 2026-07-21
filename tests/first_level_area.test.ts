import { describe, expect, it } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type Database from "better-sqlite3"
import { migrate } from "../db/migrate"

function newTmpDb(): string {
	return path.join(
		os.tmpdir(),
		`tree-area-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`,
	)
}

// 第1階層(level=1)ノードを1つ用意し、その node_id を返す
function seedL1Node(db: Database.Database): number {
	const info = db
		.prepare(
			"INSERT INTO node (name, level, scope, department_id) VALUES (?, ?, ?, ?)",
		)
		.run("第1階層ノード", 1, "common", null)
	return Number(info.lastInsertRowid)
}

describe("first_level_area", () => {
	it("マイグレーション適用後に first_level_area テーブルが存在する", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		const row = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'first_level_area'",
			)
			.get() as { name: string } | undefined
		expect(row?.name).toBe("first_level_area")

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("対応可能面積を正常に挿入できる", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)
		const nodeId = seedL1Node(db)

		const info = db
			.prepare(
				"INSERT INTO first_level_area (department_id, fiscal_year, node_id, area) VALUES (?, ?, ?, ?)",
			)
			.run("D04", 2099, nodeId, 32024)
		expect(info.changes).toBe(1)

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("area が負値だと CHECK 制約で拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)
		const nodeId = seedL1Node(db)

		expect(() =>
			db
				.prepare(
					"INSERT INTO first_level_area (department_id, fiscal_year, node_id, area) VALUES (?, ?, ?, ?)",
				)
				.run("D04", 2099, nodeId, -1),
		).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("存在しない department_id への FK 違反は拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)
		const nodeId = seedL1Node(db)

		expect(() =>
			db
				.prepare(
					"INSERT INTO first_level_area (department_id, fiscal_year, node_id, area) VALUES (?, ?, ?, ?)",
				)
				.run("ZZZ", 2099, nodeId, 100),
		).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("同一 部署・年度・ノード の重複は UNIQUE 制約で拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)
		const nodeId = seedL1Node(db)

		const insert = db.prepare(
			"INSERT INTO first_level_area (department_id, fiscal_year, node_id, area) VALUES (?, ?, ?, ?)",
		)
		insert.run("D04", 2099, nodeId, 100)
		expect(() => insert.run("D04", 2099, nodeId, 200)).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})
})
