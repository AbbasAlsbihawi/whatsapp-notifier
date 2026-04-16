export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  QR_READY = 'qr_ready',
}

export interface MessageResult {
  phone: string;
  status: 'sent' | 'failed' | 'skipped';
  messageId?: string;
  error?: string;
  sentAt?: Date;
}

export interface BulkResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: MessageResult[];
  duration: number; // ms
}

export interface WhatsAppStatus {
  status: ConnectionStatus;
  qrCode?: string;
  connectedAt?: Date;
  phone?: string;
}
