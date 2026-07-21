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
		`tree-node-edge-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`,
	)
}

// 共通ノードを2つ用意し、その node_id を返す（エッジの親子に使う）
function seedTwoNodes(db: Database.Database): { parentId: number; childId: number } {
	const insert = db.prepare(
		"INSERT INTO node (name, level, scope, department_id) VALUES (?, ?, ?, ?)",
	)
	const parentId = Number(insert.run("親(第1階層)", 1, "common", null).lastInsertRowid)
	const childId = Number(insert.run("子(第2階層)", 2, "common", null).lastInsertRowid)
	return { parentId, childId }
}

describe("node_edge", () => {
	it("マイグレーション適用後に node_edge テーブルが存在する", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		const row = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'node_edge'",
			)
			.get() as { name: string } | undefined
		expect(row?.name).toBe("node_edge")

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("正常なエッジを挿入できる", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)
		const { parentId, childId } = seedTwoNodes(db)

		const info = db
			.prepare(
				"INSERT INTO node_edge (department_id, parent_node_id, child_node_id, weight, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)",
			)
			.run("D01", parentId, childId, 0.5, "2026-04-01", null)
		expect(info.changes).toBe(1)

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("存在しない node_id への FK 違反は拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)
		const { parentId } = seedTwoNodes(db)

		expect(() =>
			db
				.prepare(
					"INSERT INTO node_edge (department_id, parent_node_id, child_node_id, weight, valid_from) VALUES (?, ?, ?, ?, ?)",
				)
				.run("D01", parentId, 999999, 0.5, "2026-04-01"),
		).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("weight=1.5 は CHECK 制約で拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)
		const { parentId, childId } = seedTwoNodes(db)

		expect(() =>
			db
				.prepare(
					"INSERT INTO node_edge (department_id, parent_node_id, child_node_id, weight, valid_from) VALUES (?, ?, ?, ?, ?)",
				)
				.run("D01", parentId, childId, 1.5, "2026-04-01"),
		).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})
})
