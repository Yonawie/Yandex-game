/**
 * Session retention hooks (short YaGames sessions).
 * Keep light — juice + one continue beat beat meta features.
 */

export type RetentionEvent =
  | "first_play"
  | "first_strike"
  | "echo_combo"
  | "result"
  | "style_buy";

const KEY = "echo_retention_v1";

type State = {
  sessions: number;
  strikes: number;
  echoes: number;
  lastDay: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sessions: 0, strikes: 0, echoes: 0, lastDay: "" };
    return { ...JSON.parse(raw) } as State;
  } catch {
    return { sessions: 0, strikes: 0, echoes: 0, lastDay: "" };
  }
}

function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function trackRetention(ev: RetentionEvent) {
  const s = load();
  const d = today();
  if (ev === "first_play") {
    if (s.lastDay !== d) {
      s.sessions += 1;
      s.lastDay = d;
    }
  } else if (ev === "first_strike" || ev === "result") {
    s.strikes += 1;
  } else if (ev === "echo_combo") {
    s.echoes += 1;
  }
  save(s);
}

export function getRetention(): State {
  return load();
}
