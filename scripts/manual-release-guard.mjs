/** Pure, fail-closed validation for a manually approved website release. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function manualReleaseError({
  expectedSha,
  checkoutSha,
  releaseVariant,
  v5BuildFlag,
  v5Confirmation,
  professionalBuildFlag = "0",
  professionalConfirmation = "",
  githubOidcAction = "preserve",
  githubOidcConfirmation = "",
  workerConfig,
} = {}) {
  if (typeof expectedSha !== "string" || !/^[a-f0-9]{40}$/.test(expectedSha))
    return "expected_sha must be the complete 40-character lowercase commit SHA on main.";
  if (checkoutSha !== expectedSha)
    return "The checked-out main commit does not match expected_sha. Review the exact tested main commit.";
  if (typeof workerConfig !== "string" ||
      !workerConfig.includes('"name": "devonakins-personal"'))
    return "The Worker configuration no longer targets devonakins-personal.";
  // This setting controls a public source and must never be implicitly enabled
  // by a routine deployment, V5 cutover, or an unrecognized dispatch input.
  if (!["preserve", "enable", "disable"].includes(githubOidcAction))
    return "GitHub OIDC action must be preserve, enable, or disable.";
  if (githubOidcAction === "enable" &&
      githubOidcConfirmation !== "GITHUB-OIDC-ENABLE-APPROVED")
    return "GitHub OIDC activation requires exact GITHUB-OIDC-ENABLE-APPROVED confirmation.";
  if (githubOidcAction !== "enable" && githubOidcConfirmation)
    return "GitHub OIDC confirmation must be empty except when enabling.";
  if (releaseVariant !== "v4" && githubOidcAction !== "preserve")
    return "GitHub OIDC activation and emergency disable are allowed on the protected V4 release only.";
  if (releaseVariant === "v4") {
    if (v5BuildFlag !== "0" || professionalBuildFlag !== "0")
      return "The V4 release must use the V4 build. Do not enable V5 or professional during a V4 hotfix.";
    if (v5Confirmation || professionalConfirmation)
      return "The V4 release cannot carry another cutover confirmation.";
    return null;
  }
  if (releaseVariant === "v5") {
    if (v5BuildFlag !== "1" || professionalBuildFlag !== "0")
      return "V5 build is not selected exclusively; professional must be off.";
    if (professionalConfirmation)
      return "V5 release cannot carry a professional cutover confirmation.";
    if (v5Confirmation !== "V5-CUTOVER-APPROVED")
      return "V5 cutover is not authorized. For the existing privacy hotfix select v4; V5 requires a tested main commit, approved review, and exact V5-CUTOVER-APPROVED confirmation.";
    return null;
  }
  if (releaseVariant === "professional") {
    if (professionalBuildFlag !== "1" || v5BuildFlag !== "0")
      return "Professional release requested but the exclusive professional build is not selected.";
    if (v5Confirmation)
      return "Professional release cannot carry a V5 cutover confirmation.";
    if (professionalConfirmation !== "PROFESSIONAL-CUTOVER-APPROVED")
      return "Professional cutover requires exact PROFESSIONAL-CUTOVER-APPROVED confirmation after review of the tested main commit and public-case-study privacy.";
    return null;
  }
  return "release_variant must be v4, v5, or professional."
}

// Workflow-only CLI. Never contacts providers or prints tokens.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
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
      professionalBuildFlag: process.env.PROFESSIONAL_SITE_CANDIDATE,
      professionalConfirmation: process.env.PROFESSIONAL_CONFIRMATION,
      githubOidcAction: process.env.GITHUB_OIDC_ACTION || "preserve",
      githubOidcConfirmation: process.env.GITHUB_OIDC_CONFIRMATION || "",
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
