export const GRADE_COMPANIES = ["PSA", "BGS", "CGC", "SGC"] as const;
/** "10", "9.5", ... "1": the grades a company can give, highest first. */
export const GRADE_VALUES: string[] = Array.from({ length: 19 }, (_, i) => String(10 - i * 0.5));

export function validGradeChoice(company: string, grade: string): boolean {
  return (GRADE_COMPANIES as readonly string[]).includes(company) && GRADE_VALUES.includes(grade);
}

export interface MeasuredCentering {
  photoId: number;
  horizontal: number;
  vertical: number;
}

/** Centering belongs to one photo. It is saved only with a card that was picked while that same photo was the current one. */
export function centeringForSave(
  measured: MeasuredCentering | null,
  pickedWithPhotoId: number | null
): { horizontal: number; vertical: number } | null {
  if (!measured || pickedWithPhotoId === null || measured.photoId !== pickedWithPhotoId) return null;
  return { horizontal: measured.horizontal, vertical: measured.vertical };
}
