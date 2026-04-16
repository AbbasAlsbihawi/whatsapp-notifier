import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendSingleDto, SendBulkDto, SendBulkFromTextDto } from './dto/send-notification.dto';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── Single Message ────────────────────────────────────────────────────────

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a single WhatsApp message' })
  async sendSingle(@Body() dto: SendSingleDto) {
    const result = await this.notificationsService.sendSingle(dto);
    return ApiResponseDto.ok(result, `Message ${result.status}`);
  }

  // ─── Bulk Messages ─────────────────────────────────────────────────────────

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send bulk WhatsApp messages from array of phones' })
  async sendBulk(@Body() dto: SendBulkDto) {
    const result = await this.notificationsService.sendBulk(dto);
    return ApiResponseDto.ok(
      result,
      `Bulk complete: ${result.sent}/${result.total} sent`,
    );
  }

  @Post('send-bulk-text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send bulk messages from plain text phone list (newline/comma separated)',
  })
  async sendBulkFromText(@Body() dto: SendBulkFromTextDto) {
    const result = await this.notificationsService.sendBulkFromText(dto);
    return ApiResponseDto.ok(
      result,
      `Bulk complete: ${result.sent}/${result.total} sent`,
    );
  }
}
