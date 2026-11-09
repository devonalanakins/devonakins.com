/** Pure, fail-closed validation for a manually approved website release. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function manualReleaseError({
  expectedSha,
  checkoutSha,
  releaseVariant,
  v5BuildFlag,
  v5Confirmation,
  workerConfig,
} = {}) {
  if (typeof expectedSha !== "string" || !/^[a-f0-9]{40}$/.test(expectedSha))
    return "expected_sha must be the complete 40-character lowercase commit SHA on main.";
  if (checkoutSha !== expectedSha)
    return "The checked-out main commit does not match expected_sha. Review the exact tested main commit.";
  if (typeof workerConfig !== "string" ||
      !workerConfig.includes('"name": "devonakins-personal"'))
    return "The Worker configuration no longer targets devonakins-personal.";
  if (releaseVariant === "v4") {
    if (v5BuildFlag !== "0")
      return "The V4 release must use the V4 build. Do not enable V5 for the privacy hotfix.";
    return null;
  }
  if (releaseVariant === "v5") {
    if (v5BuildFlag !== "1")
      return "V5 release requested but the V5 build is not selected.";
    if (v5Confirmation !== "V5-CUTOVER-APPROVED")
      return "V5 cutover is not authorized. For the existing privacy hotfix select v4; V5 requires a tested main commit, approved review, and exact V5-CUTOVER-APPROVED confirmation.";
    return null;
  }
  return "release_variant must be v4 or v5.";
}

// Workflow-only CLI. Never contacts providers or prints tokens.
if (process.argv[1] && fileURLToPath(import.meta.url) ===
    fileURLToPath(new URL("file://" + process.argv[1], import.meta.url))) {
  try {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root, encoding: "utf8", timeout: 5000,
    }).trim();
    const workerConfig = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
    const error = manualReleaseError({
      expectedSha: process.env.EXPECTED_SHA,
      checkoutSha,
      releaseVariant: process.env.RELEASE_VARIANT,
      v5BuildFlag: process.env.V5_PUBLIC_SITE_CANDIDATE,
      v5Confirmation: process.env.V5_CONFIRMATION,
      workerConfig,
    });
    if (error) {
      console.error("::error title=Manual release blocked::" + error);
      process.exitCode = 1;
    } else {
      console.log("Approved " + process.env.RELEASE_VARIANT +
        " release selection for exact commit " + checkoutSha);
    }
  } catch {
    console.error("::error title=Manual release blocked::Could not verify checked-out Git commit and Worker configuration.");
    process.exitCode = 1;
  }
}
