export const OPEN_TIMESTAMP_TIMEOUTS = {
  CREATE_MS: 8_000,
  VERIFY_MS: 15_000,
} as const;

export const OPEN_TIMESTAMP_RETRY = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1_000,
} as const;
