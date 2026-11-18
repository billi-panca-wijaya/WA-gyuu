import { IsNotEmpty, IsString } from 'class-validator';

export class SendTestMessageDto {
  @IsNotEmpty()
  @IsString()
  recipient_phone: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}
