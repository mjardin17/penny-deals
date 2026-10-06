/**
 * The verified-returns log: real grades that came back from a grading company, kept next to what the
 * app measured. It exists so the app can show, from facts, whether its centering ceiling holds up.
 */

import fs from "node:fs";
import path from "node:path";
import { centeringGradeCap } from "../../shared/cards/gradeCap";

export const COMPANIES = ["PSA", "BGS", "CGC", "SGC"] as const;
export type Company = (typeof COMPANIES)[number];
const MIN_RESULTS_TO_JUDGE = 5;

export interface GradeResult {
  cardId: string;
  company: Company;
  grade: number;
  /** What the app measured on the front before submission, if it did. */
  centering?: { horizontal: number; vertical: number };
  recordedAt: number;
}

export interface GradeStore {
  load(): GradeResult[];
  save(list: GradeResult[]): void;
}

export class MemoryGradeStore implements GradeStore {
  private list: GradeResult[] = [];
  load(): GradeResult[] {
    return this.list;
  }
  save(list: GradeResult[]): void {
    this.list = list;
  }
}

function validRecord(r: unknown): r is GradeResult {
  const o = r as Record<string, any>;
  return (
    !!o && typeof o.cardId === "string" && COMPANIES.includes(o.company) && typeof o.grade === "number" && Number.isFinite(o.grade) &&
    typeof o.recordedAt === "number" &&
    (o.centering === undefined || (Number.isFinite(o.centering.horizontal) && Number.isFinite(o.centering.vertical)))
  );
}

/** JSON file on disk, written atomically. A damaged file is never overwritten. */
export class FileGradeLog implements GradeStore {
  constructor(private readonly file: string) {}

  load(): GradeResult[] {
    if (!fs.existsSync(this.file)) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      throw new Error(`Grade log file is corrupt and was left untouched: ${this.file}`);
    }
    if (!Array.isArray(parsed) || !parsed.every(validRecord)) {
      throw new Error(`Grade log file is corrupt (unexpected contents) and was left untouched: ${this.file}`);
    }
    return parsed;
  }

  save(list: GradeResult[]): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(list));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      fs.rmSync(tmp, { force: true });
      throw err;
    }
  }
}

export class GradeLogInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GradeLogInputError";
  }
}

export class GradeLog {
  private list: GradeResult[];

  constructor(
    private readonly store: GradeStore,
    private readonly now: () => number = Date.now
  ) {
    this.list = store.load();
  }

  record(input: { cardId: unknown; company: unknown; grade: unknown; centering?: { horizontal: unknown; vertical: unknown } }): void {
    if (typeof input.cardId !== "string" || !/^(?:[a-z0-9]{2,12}:)?[\w.-]{1,40}$/.test(input.cardId)) throw new GradeLogInputError("cardId is required.");
    if (!COMPANIES.includes(input.company as Company)) throw new GradeLogInputError(`company must be one of ${COMPANIES.join(", ")}.`);
    const g = input.grade;
    if (typeof g !== "number" || !Number.isFinite(g) || g < 1 || g > 10 || (g * 2) % 1 !== 0) {
      throw new GradeLogInputError("grade must be a number from 1 to 10 in steps of 0.5.");
    }
    let centering: GradeResult["centering"];
    if (input.centering) {
      const { horizontal, vertical } = input.centering;
      for (const v of [horizontal, vertical]) {
        if (typeof v !== "number" || !Number.isFinite(v) || v < 50 || v > 100) throw new GradeLogInputError("Centering ratios must be between 50 and 100.");
      }
      centering = { horizontal: horizontal as number, vertical: vertical as number };
    }
    const next = [...this.list, { cardId: input.cardId, company: input.company as Company, grade: g, centering, recordedAt: this.now() }];
    this.store.save(next);
    this.list = next;
  }

  summary() {
    const psa = this.list.filter((r) => r.company === "PSA" && r.centering);
    const ceilingBroken = psa.filter((r) => r.grade > centeringGradeCap(r.centering!.horizontal, r.centering!.vertical).maxGrade).length;
    const verdict =
      psa.length < MIN_RESULTS_TO_JUDGE
        ? `Not enough results yet to judge the centering ceiling (need at least ${MIN_RESULTS_TO_JUDGE} PSA results with a measurement; have ${psa.length}).`
        : `The centering ceiling held in ${psa.length - ceilingBroken} of ${psa.length} PSA results.`;
    return { count: this.list.length, psaWithCentering: psa.length, ceilingBroken, verdict };
  }
}
