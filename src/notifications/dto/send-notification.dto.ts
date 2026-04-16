import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  ArrayMinSize,
  MinLength,
  IsEnum,
} from 'class-validator';

export enum MessageMediaType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

export class SendSingleDto {
  @ApiProperty({ example: '9647501234567', description: 'Phone number with country code' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Hello from WhatsApp Notifier!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  message: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: 'text', enum: MessageMediaType, default: MessageMediaType.TEXT })
  @IsOptional()
  @IsEnum(MessageMediaType)
  mediaType?: MessageMediaType;
}

export class SendBulkDto {
  @ApiProperty({
    example: ['9647501234567', '9647709876543'],
    description: 'Array of phone numbers',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  phones: string[];

  @ApiProperty({ example: 'Hello everyone! This is a bulk message.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  message: string;

  @ApiPropertyOptional({
    example: 'https://example.com/banner.jpg',
    description: 'Optional media URL to send with message',
  })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: 'image', enum: MessageMediaType, default: MessageMediaType.TEXT })
  @IsOptional()
  @IsEnum(MessageMediaType)
  mediaType?: MessageMediaType;
}

export class SendBulkFromTextDto {
  @ApiProperty({
    example: '9647501234567\n9647709876543\n07801234567',
    description: 'Phone numbers separated by newlines or commas',
  })
  @IsString()
  @IsNotEmpty()
  phonesText: string;

  @ApiProperty({ example: 'Hello everyone!' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: 'image', enum: MessageMediaType, default: MessageMediaType.TEXT })
  @IsOptional()
  @IsEnum(MessageMediaType)
  mediaType?: MessageMediaType;
}
