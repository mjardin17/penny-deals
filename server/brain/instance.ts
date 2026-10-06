import path from "node:path";
import { Brain, FileBrainStore } from "./brain";

export interface BrainHandle {
  brain: Brain | null;
  /** Why the brain is off. Logged in full; the API only says it is unavailable (no file paths leak). */
  error?: string;
}

let cached: BrainHandle | null = null;

/** One shared brain for the server (one server process per memory file). A corrupt memory file turns the brain off loudly instead of crashing lookups. */
export function getBrainHandle(): BrainHandle {
  if (cached) return cached;
  const file = process.env.BRAIN_FILE || path.join(process.cwd(), "data", "brain.json");
  try {
    cached = { brain: new Brain(new FileBrainStore(file)) };
  } catch (err) {
    const message = (err as Error).message;
    console.error("[brain] disabled:", message);
    cached = { brain: null, error: message };
  }
  return cached;
}

export function getBrain(): Brain | null {
  return getBrainHandle().brain;
}
