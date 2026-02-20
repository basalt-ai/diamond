/**
 * Pure statistical utility functions for diagnostics computations.
 * No I/O — all functions are deterministic and side-effect free.
 */

/**
 * Cohen's kappa for 2 raters.
 * Takes an array of [raterA_label, raterB_label] pairs.
 * Empty input returns 1.0 (vacuous agreement).
 * When p_e = 1 (all same category), returns 1.0 if perfect agreement, 0 otherwise.
 */
export function cohensKappa(pairs: [string, string][]): number {
  if (pairs.length === 0) return 1.0;

  const categories = new Set<string>();
  for (const [a, b] of pairs) {
    categories.add(a);
    categories.add(b);
  }

  const cats = [...categories];
  const catIndex = new Map<string, number>();
  for (let i = 0; i < cats.length; i++) {
    catIndex.set(cats[i]!, i);
  }

  const k = cats.length;
  const n = pairs.length;

  // Build confusion matrix
  const matrix: number[][] = Array.from({ length: k }, () =>
    Array.from({ length: k }, () => 0)
  );

  for (const [a, b] of pairs) {
    const ai = catIndex.get(a)!;
    const bi = catIndex.get(b)!;
    matrix[ai]![bi]! += 1;
  }

  // Observed agreement
  let po = 0;
  for (let i = 0; i < k; i++) {
    po += matrix[i]![i]!;
  }
  po /= n;

  // Expected agreement
  let pe = 0;
  for (let i = 0; i < k; i++) {
    let rowSum = 0;
    let colSum = 0;
    for (let j = 0; j < k; j++) {
      rowSum += matrix[i]![j]!;
      colSum += matrix[j]![i]!;
    }
    pe += (rowSum / n) * (colSum / n);
  }

  if (pe >= 1.0) {
    return po >= 1.0 ? 1.0 : 0;
  }

  return (po - pe) / (1 - pe);
}

/**
 * Fleiss' kappa for 3+ raters with variable n_i per item.
 * Each item maps category -> count of raters choosing it.
 * Empty input returns 1.0 (vacuous agreement).
 */
export function fleissKappa(items: Array<Record<string, number>>): number {
  if (items.length === 0) return 1.0;

  // Collect all categories
  const categories = new Set<string>();
  for (const item of items) {
    for (const cat of Object.keys(item)) {
      categories.add(cat);
    }
  }
  const cats = [...categories];

  const N = items.length;

  // Compute P_i for each item
  let pBarSum = 0;
  let totalRaters = 0;

  for (const item of items) {
    let ni = 0;
    for (const cat of cats) {
      ni += item[cat] ?? 0;
    }

    if (ni < 2) continue;
    totalRaters++;

    let sumSquares = 0;
    for (const cat of cats) {
      const nij = item[cat] ?? 0;
      sumSquares += nij * (nij - 1);
    }

    pBarSum += sumSquares / (ni * (ni - 1));
  }

  if (totalRaters === 0) return 1.0;

  const pBar = pBarSum / totalRaters;

  // Compute P_e = sum of p_j^2
  // p_j = proportion of all assignments to category j
  const catTotals = new Map<string, number>();
  let grandTotal = 0;
  for (const item of items) {
    for (const cat of cats) {
      const count = item[cat] ?? 0;
      catTotals.set(cat, (catTotals.get(cat) ?? 0) + count);
      grandTotal += count;
    }
  }

  if (grandTotal === 0) return 1.0;

  let pe = 0;
  for (const cat of cats) {
    const pj = (catTotals.get(cat) ?? 0) / grandTotal;
    pe += pj * pj;
  }

  if (pe >= 1.0) {
    return pBar >= 1.0 ? 1.0 : 0;
  }

  return (pBar - pe) / (1 - pe);
}

/**
 * Shannon entropy in bits, normalized to [0, 1].
 * Convention: 0 * log(0) = 0.
 * Returns 0 for empty input or single-category distributions.
 */
export function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  const k = counts.filter((c) => c > 0).length;
  if (k <= 1) return 0;

  let h = 0;
  for (const c of counts) {
    if (c > 0) {
      const p = c / total;
      h -= p * Math.log2(p);
    }
  }

  return h / Math.log2(k);
}

/**
 * Unnormalized Shannon entropy in bits (used internally).
 */
function rawEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  let h = 0;
  for (const c of counts) {
    if (c > 0) {
      const p = c / total;
      h -= p * Math.log2(p);
    }
  }
  return h;
}

/**
 * Mutual information between two discrete variables.
 * X and Y are parallel arrays of category labels.
 * I(X;Y) = sum_{x,y} p(x,y) * log2(p(x,y) / (p(x)*p(y)))
 */
export function mutualInformation(x: string[], y: string[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  // Joint counts
  const joint = new Map<string, number>();
  const xCounts = new Map<string, number>();
  const yCounts = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    const xi = x[i]!;
    const yi = y[i]!;
    const key = `${xi}\0${yi}`;
    joint.set(key, (joint.get(key) ?? 0) + 1);
    xCounts.set(xi, (xCounts.get(xi) ?? 0) + 1);
    yCounts.set(yi, (yCounts.get(yi) ?? 0) + 1);
  }

  let mi = 0;
  for (const [key, count] of joint) {
    const [xi, yi] = key.split("\0") as [string, string];
    const pxy = count / n;
    const px = (xCounts.get(xi) ?? 0) / n;
    const py = (yCounts.get(yi) ?? 0) / n;
    if (px > 0 && py > 0) {
      mi += pxy * Math.log2(pxy / (px * py));
    }
  }

  return Math.max(0, mi);
}

/**
 * Normalized mutual information using geometric mean.
 * NMI = I(X;Y) / sqrt(H(X) * H(Y))
 * Returns 0 when either entropy is 0.
 */
export function normalizedMI(x: string[], y: string[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const xCounts = new Map<string, number>();
  const yCounts = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    const xi = x[i]!;
    const yi = y[i]!;
    xCounts.set(xi, (xCounts.get(xi) ?? 0) + 1);
    yCounts.set(yi, (yCounts.get(yi) ?? 0) + 1);
  }

  const hx = rawEntropy([...xCounts.values()]);
  const hy = rawEntropy([...yCounts.values()]);

  if (hx === 0 || hy === 0) return 0;

  const mi = mutualInformation(x, y);
  return mi / Math.sqrt(hx * hy);
}

/**
 * KL divergence D_KL(P || Q) in bits.
 * Assumes P and Q are aligned probability distributions.
 * Convention: 0 * log(0/q) = 0. If p > 0 and q = 0, returns Infinity.
 */
function klDivergence(p: number[], q: number[]): number {
  let d = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i]!;
    const qi = q[i]!;
    if (pi > 0) {
      if (qi === 0) return Infinity;
      d += pi * Math.log2(pi / qi);
    }
  }
  return d;
}

/**
 * Jensen-Shannon divergence in bits. Bounded [0, 1].
 * P and Q are probability distributions (arrays summing to ~1).
 * Uses mixture M = (P+Q)/2.
 */
export function jensenShannonDivergence(p: number[], q: number[]): number {
  const len = Math.max(p.length, q.length);
  const m: number[] = [];
  const pn: number[] = [];
  const qn: number[] = [];

  for (let i = 0; i < len; i++) {
    const pi = p[i] ?? 0;
    const qi = q[i] ?? 0;
    pn.push(pi);
    qn.push(qi);
    m.push((pi + qi) / 2);
  }

  return (klDivergence(pn, m) + klDivergence(qn, m)) / 2;
}

/**
 * Regularized lower incomplete gamma function approximation.
 * Used for chi-squared CDF: P(a, x) = gamma_inc(a, x).
 * Uses series expansion for small x, continued fraction for large x.
 */
function regularizedGammaP(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;
  if (a <= 0) return 1;

  // Use series expansion when x < a + 1
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 200; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }

  // Use continued fraction (Lentz's method) for x >= a + 1
  // P(a,x) = 1 - Q(a,x) where Q uses the CF
  return 1 - regularizedGammaQ(a, x);
}

function regularizedGammaQ(a: number, x: number): number {
  // Continued fraction for upper incomplete gamma
  const fpmin = 1e-30;
  let b = x + 1 - a;
  let c = 1 / fpmin;
  let d = 1 / b;
  let h = d;

  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = b + an / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }

  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/**
 * Log-gamma function using Lanczos approximation.
 */
function lnGamma(z: number): number {
  const g = 7;
  const coef = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }

  z -= 1;
  let x = coef[0]!;
  for (let i = 1; i < g + 2; i++) {
    x += coef[i]! / (z + i);
  }
  const t = z + g + 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}

/**
 * Chi-squared CDF: P(X <= x) for X ~ chi2(df).
 */
function chiSquaredCdf(x: number, df: number): number {
  if (x <= 0) return 0;
  return regularizedGammaP(df / 2, x / 2);
}

/**
 * G-test statistic for independence on a contingency table.
 * Returns { gStatistic, pValue, df }.
 * Uses chi-squared approximation for the p-value.
 */
export function gTest(contingencyTable: number[][]): {
  gStatistic: number;
  pValue: number;
  df: number;
} {
  const rows = contingencyTable.length;
  if (rows === 0) return { gStatistic: 0, pValue: 1, df: 0 };

  const cols = contingencyTable[0]!.length;
  if (cols === 0) return { gStatistic: 0, pValue: 1, df: 0 };

  // Row/col totals
  const rowTotals: number[] = Array.from({ length: rows }, () => 0);
  const colTotals: number[] = Array.from({ length: cols }, () => 0);
  let grandTotal = 0;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const v = contingencyTable[i]![j]!;
      rowTotals[i]! += v;
      colTotals[j]! += v;
      grandTotal += v;
    }
  }

  if (grandTotal === 0) return { gStatistic: 0, pValue: 1, df: 0 };

  let g = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const observed = contingencyTable[i]![j]!;
      if (observed > 0) {
        const expected = (rowTotals[i]! * colTotals[j]!) / grandTotal;
        if (expected > 0) {
          g += observed * Math.log(observed / expected);
        }
      }
    }
  }
  g *= 2;

  // Count non-zero rows and cols for df
  const nonZeroRows = rowTotals.filter((r) => r > 0).length;
  const nonZeroCols = colTotals.filter((c) => c > 0).length;
  const df = Math.max(0, (nonZeroRows - 1) * (nonZeroCols - 1));

  const pValue = df > 0 ? 1 - chiSquaredCdf(g, df) : 1;

  return { gStatistic: g, pValue, df };
}
