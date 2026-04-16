import { Controller, Get, Post, Delete, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get WhatsApp connection status + QR code' })
  getStatus() {
    return ApiResponseDto.ok(this.whatsappService.getStatus());
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect WhatsApp session' })
  async disconnect() {
    await this.whatsappService.disconnect();
    return ApiResponseDto.ok(null, 'Disconnected successfully');
  }

  @Post('reconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reconnect WhatsApp' })
  async reconnect() {
    await this.whatsappService.connect();
    return ApiResponseDto.ok(null, 'Reconnecting...');
  }
}
