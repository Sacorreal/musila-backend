import { ConfigService } from '@nestjs/config';
import { WompiBankTransferProvider } from './wompi-bank-transfer.provider';

const CONFIG: Record<string, string> = {
  WOMPI_PAYOUTS_API_URL: 'https://payouts.wompi.co',
  WOMPI_PAYOUTS_API_KEY: 'wpk_test_1',
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe('WompiBankTransferProvider', () => {
  let provider: WompiBankTransferProvider;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string, fallback?: string) => CONFIG[key] ?? fallback ?? ''),
    } as unknown as ConfigService;
    provider = new WompiBankTransferProvider(config);

    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  it('listBanks mapea la lista de bancos y usa Bearer con la API key de pagos a terceros', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ id: '1007', name: 'BANCOLOMBIA' }, { id: '1051', name: 'DAVIVIENDA' }] }),
    );
    const result = await provider.listBanks();
    expect(result).toEqual([
      { id: '1007', name: 'BANCOLOMBIA' },
      { id: '1051', name: 'DAVIVIENDA' },
    ]);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://payouts.wompi.co/banks');
    expect(opts.headers.Authorization).toBe('Bearer wpk_test_1');
  });

  it('lanza ServiceUnavailable cuando Wompi responde con error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'bad' }, false, 500));
    await expect(provider.listBanks()).rejects.toThrow();
  });

  it('lanza ServiceUnavailable ante un error de red', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(provider.listBanks()).rejects.toThrow();
  });

  it('listAccountTypes y listDocumentTypes retornan catálogos estáticos', () => {
    expect(provider.listAccountTypes()).toEqual([
      { value: 'AHORROS', label: 'Ahorros' },
      { value: 'CORRIENTE', label: 'Corriente' },
    ]);
    expect(provider.listDocumentTypes().map((d) => d.value)).toEqual(['CC', 'CE', 'NIT']);
  });
});
