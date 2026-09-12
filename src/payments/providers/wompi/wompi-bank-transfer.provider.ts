import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankTransferProvider } from '../../domain/bank-transfer-provider.interface';
import {
  AccountTypeOption,
  BankOption,
  BankTransferProviderName,
  DocumentTypeOption,
} from '../../domain/bank-transfer-provider.types';

/**
 * Implementación concreta del puerto `BankTransferProvider` contra la API de
 * "pagos a terceros" de Wompi (https://docs.wompi.co/docs/colombia/introduccion-pagos-a-terceros/).
 * Es un producto Wompi distinto del checkout (`WompiProvider`): usa su propia
 * base URL, API key e ID de usuario principal (`WOMPI_PAYOUTS_API_URL` /
 * `WOMPI_PAYOUTS_API_KEY` / `WOMPI_PAYOUTS_USER_PRINCIPAL_ID`). Autentica con
 * los headers `x-api-key` + `user-principal-id` — NO con `Authorization: Bearer`
 * (ver "Ambientes y llaves" en la doc de pagos a terceros).
 *
 * Alcance actual: solo `GET /banks` para poblar el selector de cuenta de
 * cobro. No implementa `POST /payouts` (envío real de dinero) — fuera del
 * alcance de esta entrega.
 */
@Injectable()
export class WompiBankTransferProvider implements BankTransferProvider {
  readonly name: BankTransferProviderName = 'wompi';
  private readonly logger = new Logger(WompiBankTransferProvider.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiUrl(): string {
    const url = this.configService.get<string>('WOMPI_PAYOUTS_API_URL', '');
    if (!url) throw new Error('WOMPI_PAYOUTS_API_URL no está configurado');
    return url.replace(/\/$/, '');
  }

  private get apiKey(): string {
    const key = this.configService.get<string>('WOMPI_PAYOUTS_API_KEY', '');
    if (!key) throw new Error('WOMPI_PAYOUTS_API_KEY no está configurado');
    return key;
  }

  private get userPrincipalId(): string {
    const id = this.configService.get<string>('WOMPI_PAYOUTS_USER_PRINCIPAL_ID', '');
    if (!id) throw new Error('WOMPI_PAYOUTS_USER_PRINCIPAL_ID no está configurado');
    return id;
  }

  async listBanks(): Promise<BankOption[]> {
    const data = await this.request<any>('GET', '/banks');
    const banks = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return banks.map((bank: any) => ({
      id: String(bank.id ?? bank.bank_id),
      name: String(bank.name ?? bank.bank_name),
    }));
  }

  listAccountTypes(): AccountTypeOption[] {
    return [
      { value: 'AHORROS', label: 'Ahorros' },
      { value: 'CORRIENTE', label: 'Corriente' },
    ];
  }

  listDocumentTypes(): DocumentTypeOption[] {
    return [
      { value: 'CC', label: 'Cédula de ciudadanía' },
      { value: 'CE', label: 'Cédula de extranjería' },
      { value: 'NIT', label: 'NIT' },
    ];
  }

  /** Cliente HTTP genérico contra la API de "pagos a terceros" de Wompi. */
  private async request<T>(method: 'GET' | 'POST', path: string, body?: Record<string, any>): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'user-principal-id': this.userPrincipalId,
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) }),
      });
    } catch (err: any) {
      this.logger.error(`[Wompi Payouts] error de red en ${method} ${path}: ${err?.message}`);
      throw new ServiceUnavailableException('Wompi no está disponible. Intenta nuevamente.');
    }

    const text = await res.text();
    const json = text ? safeJsonParse(text) : {};

    if (!res.ok) {
      this.logger.error(`[Wompi Payouts] ${method} ${path} respondió ${res.status}: ${text?.slice(0, 500)}`);
      throw new ServiceUnavailableException('Wompi no está disponible. Intenta nuevamente.');
    }

    return json as T;
  }
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
