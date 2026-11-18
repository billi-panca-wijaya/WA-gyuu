import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateSenderDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  otp_enabled?: boolean;
}
