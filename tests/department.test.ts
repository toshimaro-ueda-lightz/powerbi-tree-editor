import { describe, expect, it } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { migrate } from "../db/migrate"

describe("department", () => {
	it("空DBにマイグレーション→15部署が入り、再実行しても増えない", () => {
		const tmpDb = path.join(os.tmpdir(), `tree-test-${Date.now()}.sqlite`)

		// 1回目：空DBから作成
		const db1 = migrate(tmpDb)
		const count1 = db1
			.prepare("SELECT COUNT(*) AS c FROM department")
			.get() as { c: number }
		expect(count1.c).toBe(15)

		const d01 = db1
			.prepare("SELECT display_name FROM department WHERE department_id = 'D01'")
			.get() as { display_name: string }
		expect(d01.display_name).toBe("技企画")
		db1.close()

		// 2回目：再実行しても冪等
		const db2 = migrate(tmpDb)
		const count2 = db2
			.prepare("SELECT COUNT(*) AS c FROM department")
			.get() as { c: number }
		expect(count2.c).toBe(15)
		db2.close()

		fs.rmSync(tmpDb, { force: true })
	})
})