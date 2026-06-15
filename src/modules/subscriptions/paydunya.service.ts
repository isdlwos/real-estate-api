import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const SANDBOX_BASE = 'https://app.paydunya.com/sandbox-api/v1';
const SANDBOX_CHECKOUT = 'https://app.paydunya.com/sandbox-checkout/1.1';

export interface PaydunyaInvoice {
  token: string;
  checkoutUrl: string;
}

@Injectable()
export class PaydunyaService {
  private readonly logger = new Logger(PaydunyaService.name);

  constructor(private readonly http: HttpService) {}

  async createInvoice(opts: {
    amount: number;
    description: string;
    callbackUrl: string;
    returnUrl: string;
    cancelUrl: string;
    customData?: Record<string, string>;
  }): Promise<PaydunyaInvoice> {
    const masterKey  = process.env.PAYDUNYA_MASTER_KEY  ?? 'test_master_key';
    const privateKey = process.env.PAYDUNYA_PRIVATE_KEY ?? 'test_private_key';
    const token      = process.env.PAYDUNYA_TOKEN        ?? 'test_token';
    const isSandbox  = process.env.PAYDUNYA_MODE !== 'live';

    const baseUrl = isSandbox ? SANDBOX_BASE : 'https://app.paydunya.com/api/v1';
    const checkoutBase = isSandbox ? SANDBOX_CHECKOUT : 'https://app.paydunya.com/checkout/1.1';

    const payload = {
      invoice: {
        total_amount: opts.amount,
        description: opts.description,
      },
      store: {
        name: 'Prestige Immobilier',
      },
      actions: {
        callback_url: opts.callbackUrl,
        return_url:   opts.returnUrl,
        cancel_url:   opts.cancelUrl,
      },
      custom_data: opts.customData ?? {},
    };

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${baseUrl}/checkout-invoice/create`, payload, {
          headers: {
            'PAYDUNYA-MASTER-KEY':  masterKey,
            'PAYDUNYA-PRIVATE-KEY': privateKey,
            'PAYDUNYA-TOKEN':       token,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log('PayDunya response: ' + JSON.stringify(data));

      if (data.response_code !== '00') {
        this.logger.error('PayDunya error', data);
        throw new InternalServerErrorException('Erreur lors de la création du paiement');
      }

      // PayDunya retourne l'URL dans response_text quand response_code === '00'
      const checkoutUrl = data.response_text ?? `${checkoutBase}/${data.token}`;

      return {
        token:       data.token,
        checkoutUrl,
      };
    } catch (err: any) {
      if (err.response?.data) {
        this.logger.error('PayDunya HTTP error', err.response.data);
      }
      throw err instanceof InternalServerErrorException
        ? err
        : new InternalServerErrorException('Service PayDunya indisponible');
    }
  }

  async getInvoiceStatus(invoiceToken: string): Promise<string> {
    const masterKey  = process.env.PAYDUNYA_MASTER_KEY  ?? 'test_master_key';
    const privateKey = process.env.PAYDUNYA_PRIVATE_KEY ?? 'test_private_key';
    const token      = process.env.PAYDUNYA_TOKEN        ?? 'test_token';
    const isSandbox  = process.env.PAYDUNYA_MODE !== 'live';
    const baseUrl = isSandbox ? SANDBOX_BASE : 'https://app.paydunya.com/api/v1';

    const { data } = await firstValueFrom(
      this.http.get(`${baseUrl}/checkout-invoice/confirm/${invoiceToken}`, {
        headers: {
          'PAYDUNYA-MASTER-KEY':  masterKey,
          'PAYDUNYA-PRIVATE-KEY': privateKey,
          'PAYDUNYA-TOKEN':       token,
        },
      }),
    );

    return data.status; // 'completed' | 'pending' | 'cancelled'
  }
}
