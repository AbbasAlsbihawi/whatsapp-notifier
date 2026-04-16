import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { BulkResult, MessageResult } from '../whatsapp/whatsapp.types';
import { SendSingleDto, SendBulkDto, SendBulkFromTextDto, MessageMediaType } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  async sendSingle(dto: SendSingleDto): Promise<MessageResult> {
    if (!this.whatsappService.isConnected()) {
      throw new BadRequestException('WhatsApp is not connected. Please scan QR code first.');
    }

    const mediaType = dto.mediaType ?? MessageMediaType.TEXT;

    if (mediaType !== MessageMediaType.TEXT && dto.url) {
      return this.whatsappService.sendMediaMessage(dto.phone, dto.url, mediaType, dto.message);
    }

    return this.whatsappService.sendTextMessage(dto.phone, dto.message);
  }

  async sendBulk(dto: SendBulkDto): Promise<BulkResult> {
    if (!this.whatsappService.isConnected()) {
      throw new BadRequestException('WhatsApp is not connected. Please scan QR code first.');
    }

    const phones = dto.phones.map((p) => p.trim()).filter(Boolean);

    if (phones.length === 0) {
      throw new BadRequestException('No valid phone numbers provided');
    }

    const mediaType = dto.mediaType ?? MessageMediaType.TEXT;

    if (mediaType !== MessageMediaType.TEXT && dto.url) {
      return this.whatsappService.sendBulkMedia(phones, dto.url, mediaType, dto.message);
    }

    return this.whatsappService.sendBulkText(phones, dto.message);
  }

  async sendBulkFromText(dto: SendBulkFromTextDto): Promise<BulkResult> {
    if (!this.whatsappService.isConnected()) {
      throw new BadRequestException('WhatsApp is not connected. Please scan QR code first.');
    }

    // Parse phones from text (supports newlines, commas, semicolons)
    const phones = dto.phonesText
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (phones.length === 0) {
      throw new BadRequestException('Could not parse any phone numbers');
    }

    this.logger.log(`Parsed ${phones.length} phone numbers from text`);

    const mediaType = dto.mediaType ?? MessageMediaType.TEXT;

    if (mediaType !== MessageMediaType.TEXT && dto.url) {
      return this.whatsappService.sendBulkMedia(phones, dto.url, mediaType, dto.message);
    }

    return this.whatsappService.sendBulkText(phones, dto.message);
  }
}
