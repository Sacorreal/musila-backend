export enum WalletDistributionSource {
  CONTRACT_ADVANCE_DISTRIBUTION = 'contract_advance_distribution',
  SPLIT = 'split',
  EQUAL_FALLBACK = 'equal_fallback',
  /** Comisión acreditada a la wallet de una publisher (no proviene del reparto entre autores). */
  PUBLISHER_COMMISSION = 'publisher_commission',
}
