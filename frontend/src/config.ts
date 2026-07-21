// App-wide static configuration that isn't part of the domain model or any
// single service. Fiscal years are a frontend-only concept for now (there is
// no "valid fiscal years" table in SQLite) — moved here (out of mock/) so it
// has no dependency on the mock service.

const FY_CURRENT = 2026;
const FY_PREVIOUS = 2025;

export const FISCAL_YEARS = [FY_PREVIOUS, FY_CURRENT, 2027] as const;
export const CURRENT_FISCAL_YEAR = FY_CURRENT;
