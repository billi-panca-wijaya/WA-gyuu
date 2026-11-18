import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateChallengeDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'phone_e164 must be in valid E.164 format (e.g. +628123456789)',
  })
  phone_e164: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  browser_binding?: string;
}
