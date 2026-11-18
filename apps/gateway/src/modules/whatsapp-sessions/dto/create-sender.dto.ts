import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateSenderDto {
  @IsNotEmpty()
  @IsString()
  label: string;

  @IsOptional()
  @IsIn(['qr', 'phone_code'])
  pairing_method?: 'qr' | 'phone_code';

  @IsOptional()
  @IsString()
  phone?: string;
}
