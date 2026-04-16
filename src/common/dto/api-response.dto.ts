import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  error?: string;

  static ok<T>(data: T, message = 'Success'): ApiResponseDto<T> {
    return { success: true, message, data };
  }

  static fail(error: string, message = 'Failed'): ApiResponseDto<null> {
    return { success: false, message, data: null, error };
  }
}
