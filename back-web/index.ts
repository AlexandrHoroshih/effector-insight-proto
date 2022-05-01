import type { Domain } from "effector";

function attachInsight(
  domain: Domain,
  config?: {
    coordinator?: {
      port?: number;
    };
  }
): void {
  if (!domain) {
    throw new Error("Must have domain!!");
  }
}

export { attachInsight };
