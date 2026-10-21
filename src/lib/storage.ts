import type { AttemptRecord, TestConfig } from './types';

const ATTEMPTS = 'mtt.attempts.v1';
const ACTIVE = 'mtt.activeConfig.v1';
const ISM = 'mtt.ismCheck.v1';
const MAX = 200;

function read<T>(key: string, fallback: T, store: Storage | undefined = safe()): T {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown, store: Storage | undefined = safe()) {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be full or blocked; the app still works without it */
  }
}
function safe(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
function safeSession(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}

/** Anonymous/local results live only in this browser's localStorage. */
export const attemptsStore = {
  list: (): AttemptRecord[] => read<AttemptRecord[]>(ATTEMPTS, []),
  get: (id: string) => attemptsStore.list().find((a) => a.id === id),
  add(a: AttemptRecord) {
    const all = attemptsStore.list().filter((x) => x.id !== a.id);
    all.unshift(a);
    write(ATTEMPTS, all.slice(0, MAX));
  },
  clear: () => write(ATTEMPTS, []),
};

export const activeConfigStore = {
  get: () => read<TestConfig | null>(ACTIVE, null, safeSession()),
  set: (c: TestConfig) => write(ACTIVE, c, safeSession()),
};

export interface IsmCheck {
  verifiedAt: string;
  codePoints: number;
  userAgent: string;
  matchPercent: number;
}
export const ismStore = {
  get: () => read<IsmCheck | null>(ISM, null),
  set: (c: IsmCheck) => write(ISM, c),
  clear: () => write(ISM, null),
};
