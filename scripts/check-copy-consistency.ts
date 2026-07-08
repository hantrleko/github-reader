/**
 * Standalone copy-consistency checker.
 * Verifies the landing page + every section page use the unified editorial
 * title / 导语 / SEO format defined in src/lib/seoCopy.ts.
 *
 * Run: bunx tsx scripts/check-copy-consistency.ts
 * Exits non-zero (CI-friendly) when any copy drifts from the rules.
 */
import { validateAllCopy } from "../src/lib/seoCopy";

const issues = validateAllCopy();

if (issues.length === 0) {
  console.log("✓ 文案一致性检查通过：首页与所有板块符合统一编辑风格规则。");
  process.exit(0);
}

console.error(`✗ 发现 ${issues.length} 处文案不一致：\n`);
for (const i of issues) {
  console.error(`  [${i.id}] ${i.field}: ${i.message}`);
}
process.exit(1);
