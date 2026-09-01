import type { PortfolioAnalysis } from "../types.js";

/**
 * Renders a PortfolioAnalysis as a short list of plain-English lines,
 * suitable for a UI panel or a CLI summary. This never invents claims
 * beyond what the underlying signals/thresholds already state.
 */
export function formatAnalysis(analysis: PortfolioAnalysis): string[] {
  const lines: string[] = [];

  lines.push(
    `Portfolio for ${analysis.portfolio.address} (${analysis.portfolio.network}) — ` +
      `${analysis.portfolio.isLiveData ? "real Stacks data" : "includes demo fixture data"}.`,
  );

  for (const signal of analysis.signals) {
    lines.push(`- ${signal.explanation} (level: ${signal.level})`);
  }

  const allExcluded = analysis.signals.flatMap((s) => s.excludedAssets);
  if (allExcluded.length > 0) {
    const uniqueSymbols = [...new Set(allExcluded.map((a) => a.symbol))];
    lines.push(
      `- Note: ${uniqueSymbols.length} token(s) with unverified decimals were excluded from ` +
        `value-based calculations rather than estimated: ${uniqueSymbols.join(", ")}.`,
    );
  }

  lines.push(
    `- Risk score: ${analysis.score.score}/100 (${analysis.score.label}, prototype heuristic).`,
  );

  if (analysis.thresholds.status === "warning") {
    lines.push("- Threshold warnings:");
    for (const explanation of analysis.thresholds.explanation) {
      lines.push(`  - ${explanation}`);
    }
  } else {
    lines.push("- No configured thresholds were triggered.");
  }

  return lines;
}
