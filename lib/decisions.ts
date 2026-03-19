import fs from "fs";
import path from "path";

type DecisionValue = "concert" | "not_concert";

interface Decisions {
  [uid: string]: DecisionValue;
}

const DECISIONS_PATH = path.join(process.cwd(), "data", "decisions.json");

function ensureFile(): void {
  const dir = path.dirname(DECISIONS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DECISIONS_PATH)) {
    fs.writeFileSync(DECISIONS_PATH, "{}", "utf-8");
  }
}

export function getDecisions(): Decisions {
  ensureFile();
  const raw = fs.readFileSync(DECISIONS_PATH, "utf-8");
  return JSON.parse(raw) as Decisions;
}

export function saveDecision(uid: string, decision: DecisionValue): void {
  ensureFile();
  const decisions = getDecisions();
  decisions[uid] = decision;
  fs.writeFileSync(DECISIONS_PATH, JSON.stringify(decisions, null, 2), "utf-8");
}
