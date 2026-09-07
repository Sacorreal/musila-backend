/**
 * Tipos de dominio del proveedor de transferencias bancarias ("pagos a
 * terceros"), usados para poblar el selector de cuenta de cobro en Colombia.
 * Es un producto Wompi distinto del checkout (`PaymentProvider`): auth y base
 * URL propias.
 */

export type BankTransferProviderName = 'wompi';

export interface BankOption {
  id: string;
  name: string;
}

export interface AccountTypeOption {
  value: string;
  label: string;
}

export interface DocumentTypeOption {
  value: string;
  label: string;
}

export interface TransferOptionsResult {
  banks: BankOption[];
  accountTypes: AccountTypeOption[];
  documentTypes: DocumentTypeOption[];
}
