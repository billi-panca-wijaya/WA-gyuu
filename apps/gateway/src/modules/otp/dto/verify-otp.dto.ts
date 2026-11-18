import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'code must be exactly 4 numeric digits',
  })
  code: string;

  @IsOptional()
  @IsString()
  browser_binding?: string;
}
