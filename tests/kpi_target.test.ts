import { describe, expect, it } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { migrate } from "../db/migrate"

function newTmpDb(): string {
	return path.join(
		os.tmpdir(),
		`tree-kpi-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`,
	)
}

describe("kpi_target", () => {
	it("マイグレーション適用後に kpi_target テーブルが存在する", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		const row = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'kpi_target'",
			)
			.get() as { name: string } | undefined
		expect(row?.name).toBe("kpi_target")

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("年度KPI目標を正常に挿入できる", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		const info = db
			.prepare(
				"INSERT INTO kpi_target (department_id, fiscal_year, target_value) VALUES (?, ?, ?)",
			)
			.run("D04", 2099, 60000)
		expect(info.changes).toBe(1)

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("存在しない department_id への FK 違反は拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		expect(() =>
			db
				.prepare(
					"INSERT INTO kpi_target (department_id, fiscal_year, target_value) VALUES (?, ?, ?)",
				)
				.run("ZZZ", 2099, 60000),
		).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})

	it("同一 部署・年度 の重複は UNIQUE 制約で拒否される", () => {
		const tmpDb = newTmpDb()
		const db = migrate(tmpDb)

		const insert = db.prepare(
			"INSERT INTO kpi_target (department_id, fiscal_year, target_value) VALUES (?, ?, ?)",
		)
		insert.run("D04", 2099, 60000)
		expect(() => insert.run("D04", 2099, 70000)).toThrow()

		db.close()
		fs.rmSync(tmpDb, { force: true })
	})
})
