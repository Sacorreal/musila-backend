import { BankOption, AccountTypeOption, DocumentTypeOption, BankTransferProviderName } from './bank-transfer-provider.types';

/**
 * Token de inyección de NestJS para el proveedor de transferencias bancarias
 * activo (usado para poblar el selector de cuenta de cobro en Colombia).
 */
export const BANK_TRANSFER_PROVIDER = Symbol('BANK_TRANSFER_PROVIDER');

/**
 * Puerto de la capa de dominio que abstrae el proveedor colombiano de
 * "pagos a terceros" (transferencias bancarias). Sustituir el proveedor solo
 * requiere implementar esta interfaz y registrarla en `payments.module.ts`
 * mediante el token `BANK_TRANSFER_PROVIDER`. La lógica de negocio
 * (`BankInformationService`) no debe referenciar ningún SDK ni API concreta.
 *
 * Alcance actual: solo captura de datos para el selector (no ejecuta
 * transferencias reales — `POST /payouts` queda fuera de este puerto).
 */
export interface BankTransferProvider {
  /** Identificador del proveedor, útil para auditoría/logs. */
  readonly name: BankTransferProviderName;

  /** Lista de bancos disponibles para transferencia, obtenida dinámicamente. */
  listBanks(): Promise<BankOption[]>;

  /** Catálogo de tipos de cuenta soportados (estático, expuesto por el puerto). */
  listAccountTypes(): AccountTypeOption[];

  /** Catálogo de tipos de documento soportados (estático, expuesto por el puerto). */
  listDocumentTypes(): DocumentTypeOption[];
}
