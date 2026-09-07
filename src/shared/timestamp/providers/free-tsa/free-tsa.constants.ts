export const FREE_TSA_OIDS = {
  SHA256: '2.16.840.1.101.3.4.2.1',
  CONTENT_TYPE_SIGNED_DATA: '1.2.840.113549.1.7.2',
  CONTENT_TYPE_TST_INFO: '1.2.840.113549.1.9.16.1.4',
} as const;

export const FREE_TSA_TIMEOUTS = {
  CREATE_MS: 8_000,
} as const;

export const FREE_TSA_RETRY = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1_000,
} as const;
