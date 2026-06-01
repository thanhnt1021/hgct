// Feature flags for the coin-rework rollout.
//
// Legacy PDF + email flow: code is kept intact but hidden behind this flag
// so it can be re-enabled later by flipping a single env var.
// Default OFF — site runs on the coin/stream model.

export const PDF_EMAIL_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_PDF_FLOW === 'true'
