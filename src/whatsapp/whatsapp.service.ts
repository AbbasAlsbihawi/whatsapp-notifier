import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  AnyMessageContent,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import {
  ConnectionStatus,
  MessageResult,
  BulkResult,
  WhatsAppStatus,
} from './whatsapp.types';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private sock: WASocket | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private qrCode: string | null = null;
  private connectedAt: Date | null = null;
  private connectedPhone: string | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 5;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  // ─── Connection ───────────────────────────────────────────────────────────

  async connect() {
    try {
      const authDir = this.configService.get<string>('whatsapp.authDir') ?? './auth_info';
      const printQr = this.configService.get<boolean>('whatsapp.printQr') ?? true;

      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const { version } = await fetchLatestBaileysVersion();

      this.logger.log(`Using WA Web version: ${version.join('.')}`);
      this.status = ConnectionStatus.CONNECTING;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: printQr,
        logger: require('pino')({ level: 'silent' }),
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = qr;
          this.status = ConnectionStatus.QR_READY;
          this.logger.log('📱 QR Code ready — scan with WhatsApp');
        }

        if (connection === 'open') {
          this.status = ConnectionStatus.CONNECTED;
          this.connectedAt = new Date();
          this.reconnectAttempts = 0;
          this.qrCode = null;

          // get connected phone number
          const me = this.sock?.user;
          this.connectedPhone = me?.id?.split(':')[0] ?? null;

          this.logger.log(`✅ WhatsApp connected as: ${this.connectedPhone}`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          this.status = ConnectionStatus.DISCONNECTED;
          this.connectedPhone = null;

          if (isLoggedOut) {
            this.logger.warn('🔴 Logged out — delete auth_info and restart');
            return;
          }

          if (this.reconnectAttempts < this.MAX_RECONNECT) {
            this.reconnectAttempts++;
            const delay = this.reconnectAttempts * 3000;
            this.logger.warn(
              `🔄 Reconnecting (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT}) in ${delay}ms`,
            );
            setTimeout(() => this.connect(), delay);
          } else {
            this.logger.error('❌ Max reconnect attempts reached');
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to connect:', (error as Error).message);
      throw error;
    }
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
      this.status = ConnectionStatus.DISCONNECTED;
      this.logger.log('WhatsApp disconnected');
    }
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  getStatus(): WhatsAppStatus {
    return {
      status: this.status,
      qrCode: this.qrCode,
      connectedAt: this.connectedAt,
      phone: this.connectedPhone,
    };
  }

  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED && !!this.sock;
  }

  // ─── Messaging ────────────────────────────────────────────────────────────

  /**
   * Normalize phone number to WhatsApp JID format.
   * Accepts: 9647501234567 | +9647501234567 | 07501234567
   */
  private normalizeJid(phone: string): string {
    let normalized = phone.replace(/\D/g, '');

    // Iraqi local number (starts with 0) → add country code
    if (normalized.startsWith('0')) {
      normalized = '964' + normalized.slice(1);
    }

    return `${normalized}@s.whatsapp.net`;
  }

  async sendTextMessage(phone: string, text: string): Promise<MessageResult> {
    if (!this.isConnected()) {
      return { phone, status: 'failed', error: 'WhatsApp not connected' };
    }

    const jid = this.normalizeJid(phone);
    const maxRetries = this.configService.get<number>('whatsapp.maxRetries') ?? 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const msg = await this.sock!.sendMessage(jid, { text });
        return {
          phone,
          status: 'sent',
          messageId: msg?.key?.id ?? undefined,
          sentAt: new Date(),
        };
      } catch (error) {
        this.logger.warn(
          `Attempt ${attempt}/${maxRetries} failed for ${phone}: ${(error as Error).message}`,
        );
        if (attempt === maxRetries) {
          return { phone, status: 'failed', error: (error as Error).message };
        }
        await this.delay(1000 * attempt);
      }
    }

    // Unreachable but satisfies TypeScript's return-type check
    return { phone, status: 'failed', error: 'All retries exhausted' };
  }

  async sendImageMessage(
    phone: string,
    imageUrl: string,
    caption?: string,
  ): Promise<MessageResult> {
    if (!this.isConnected()) {
      return { phone, status: 'failed', error: 'WhatsApp not connected' };
    }

    const jid = this.normalizeJid(phone);

    try {
      const content: AnyMessageContent = {
        image: { url: imageUrl },
        caption: caption ?? undefined,
      };
      const msg = await this.sock!.sendMessage(jid, content);
      return { phone, status: 'sent', messageId: msg?.key?.id ?? undefined, sentAt: new Date() };
    } catch (error) {
      return { phone, status: 'failed', error: (error as Error).message };
    }
  }

  async sendMediaMessage(
    phone: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string,
  ): Promise<MessageResult> {
    if (!this.isConnected()) {
      return { phone, status: 'failed', error: 'WhatsApp not connected' };
    }

    const jid = this.normalizeJid(phone);

    // Build content per media type — document requires mimetype
    let content: AnyMessageContent;
    if (mediaType === 'image') {
      content = { image: { url: mediaUrl }, caption: caption ?? undefined };
    } else if (mediaType === 'video') {
      content = { video: { url: mediaUrl }, caption: caption ?? undefined };
    } else if (mediaType === 'audio') {
      content = { audio: { url: mediaUrl }, mimetype: 'audio/mp4' };
    } else {
      content = { document: { url: mediaUrl }, mimetype: 'application/octet-stream', caption: caption ?? undefined };
    }

    try {
      const msg = await this.sock!.sendMessage(jid, content);
      return { phone, status: 'sent', messageId: msg?.key?.id ?? undefined, sentAt: new Date() };
    } catch (error) {
      return { phone, status: 'failed', error: (error as Error).message };
    }
  }

  // ─── Bulk Send ────────────────────────────────────────────────────────────

  async sendBulkText(
    phones: string[],
    message: string,
    onProgress?: (result: MessageResult, index: number, total: number) => void,
  ): Promise<BulkResult> {
    return this.sendBulkMessages(phones, (phone) => this.sendTextMessage(phone, message), onProgress);
  }

  async sendBulkMedia(
    phones: string[],
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string,
    onProgress?: (result: MessageResult, index: number, total: number) => void,
  ): Promise<BulkResult> {
    return this.sendBulkMessages(
      phones,
      (phone) => this.sendMediaMessage(phone, mediaUrl, mediaType, caption),
      onProgress,
    );
  }

  private async sendBulkMessages(
    phones: string[],
    sendFn: (phone: string) => Promise<MessageResult>,
    onProgress?: (result: MessageResult, index: number, total: number) => void,
  ): Promise<BulkResult> {
    const startTime = Date.now();
    const delay = this.configService.get<number>('whatsapp.delayBetweenMessages') ?? 1500;
    const results: MessageResult[] = [];

    this.logger.log(`📤 Starting bulk send to ${phones.length} numbers`);

    for (let i = 0; i < phones.length; i++) {
      const phone = phones[i].trim();

      if (!phone) {
        results.push({ phone, status: 'skipped', error: 'Empty phone number' });
        continue;
      }

      const result = await sendFn(phone);
      results.push(result);

      if (onProgress) {
        onProgress(result, i + 1, phones.length);
      }

      this.logger.log(`[${i + 1}/${phones.length}] ${phone} → ${result.status}`);

      // Delay between messages (except last one)
      if (i < phones.length - 1) {
        await this.delay(delay);
      }
    }

    const duration = Date.now() - startTime;
    const sent = results.filter((r) => r.status === 'sent').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    this.logger.log(
      `✅ Bulk done: ${sent} sent, ${failed} failed, ${skipped} skipped (${duration}ms)`,
    );

    return { total: phones.length, sent, failed, skipped, results, duration };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
