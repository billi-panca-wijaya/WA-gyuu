import { IsOptional, IsString } from 'class-validator';

export class ResendChallengeDto {
  @IsOptional()
  @IsString()
  browser_binding?: string;
}
