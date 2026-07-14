import { migrate } from "./migrate"

migrate().close()
console.log("migration complete")