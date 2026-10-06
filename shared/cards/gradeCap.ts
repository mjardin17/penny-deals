/**
 * What measured centering allows, and nothing more. Centering is one of four things graders look at
 * (corners, edges and surface are the others); this is only a ceiling from centering.
 */

export interface CenteringCap {
  /** Highest grade centering alone would allow. 6 means "6 or lower". */
  maxGrade: 10 | 9 | 8 | 7 | 6;
  label: string;
  /** The wider side's share (50-100) in whichever direction is worse. */
  worst: number;
  note: string;
}

export const CENTERING_SOURCE = {
  company: "PSA",
  retrieved: "2026-10-06",
  frontCutoffs: [
    { grade: 10, worst: 55 },
    { grade: 9, worst: 60 },
    { grade: 8, worst: 65 },
    { grade: 7, worst: 70 },
  ],
  caveat:
    "Quoted from secondary sources citing PSA's published standards; psacard.com blocked automated retrieval, so these were not verified at the source. Only front-centering cutoffs for grades 10 to 7 are used, and the back is not measured. Other grading companies use different cutoffs.",
} as const;

export function centeringGradeCap(horizontalLarger: number, verticalLarger: number): CenteringCap {
  for (const v of [horizontalLarger, verticalLarger]) {
    if (!Number.isFinite(v) || v < 50 || v > 100) throw new Error("Centering ratios must be between 50 and 100.");
  }
  const worst = Math.max(horizontalLarger, verticalLarger);
  const note = "This is a ceiling from centering only. Corners, edges and surface can still lower the grade, and a phone photo can't judge them.";
  for (const { grade, worst: limit } of CENTERING_SOURCE.frontCutoffs) {
    if (worst <= limit) return { maxGrade: grade as 10 | 9 | 8 | 7, label: `PSA ${grade} at most`, worst, note };
  }
  return { maxGrade: 6, label: "PSA 6 or lower (cutoffs beyond 70/30 are not verified)", worst, note };
}
