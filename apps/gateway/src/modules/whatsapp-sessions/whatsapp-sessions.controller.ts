import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WhatsAppSessionsService } from './whatsapp-sessions.service';
import { CurrentBrand } from '../../common/decorators/brand.decorator';
import { BrandEntity } from '../brands/entities/brand.entity';
import { CreateSenderDto } from './dto/create-sender.dto';
import { UpdateSenderDto } from './dto/update-sender.dto';
import { SendTestMessageDto } from './dto/send-test-message.dto';
import { BrandAuthGuard } from '../authentication/guards/brand-auth.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('v1')
@UseGuards(BrandAuthGuard)
export class WhatsAppSessionsController {
  constructor(private readonly sessionsService: WhatsAppSessionsService) {}

  @Get('capabilities')
  @Public()
  getCapabilities() {
    return this.sessionsService.getCapabilities();
  }

  @Get('senders')
  @RequireScope('senders:read')
  async listSenders(@CurrentBrand() brand: BrandEntity) {
    return this.sessionsService.listSenders(brand.id);
  }

  @Post('senders')
  @HttpCode(HttpStatus.CREATED)
  @RequireScope('senders:write')
  async createSender(
    @CurrentBrand() brand: BrandEntity,
    @Body() dto: CreateSenderDto,
  ) {
    return this.sessionsService.createSender(brand.id, dto);
  }

  @Get('senders/:id')
  @RequireScope('senders:read')
  async getSender(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
  ) {
    return this.sessionsService.getSender(brand.id, id);
  }

  @Patch('senders/:id')
  @RequireScope('senders:write')
  async updateSender(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
    @Body() dto: UpdateSenderDto,
  ) {
    return this.sessionsService.updateSender(brand.id, id, dto);
  }

  @Delete('senders/:id')
  @RequireScope('senders:write')
  async deleteSender(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
  ) {
    return this.sessionsService.deleteSender(brand.id, id);
  }

  @Post('senders/:id/pairing')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireScope('senders:write')
  async startPairing(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
  ) {
    return this.sessionsService.startPairing(brand.id, id);
  }

  @Get('senders/:id/pairing')
  @RequireScope('senders:read')
  async getPairing(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
  ) {
    return this.sessionsService.getPairing(brand.id, id);
  }

  @Post('senders/:id/start')
  @RequireScope('senders:write')
  async startSender(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
  ) {
    return this.sessionsService.startSender(brand.id, id);
  }

  @Post('senders/:id/stop')
  @RequireScope('senders:write')
  async stopSender(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
  ) {
    return this.sessionsService.stopSender(brand.id, id);
  }

  @Post('senders/:id/logout')
  @RequireScope('senders:write')
  async logoutSender(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
  ) {
    return this.sessionsService.logoutSender(brand.id, id);
  }

  @Post('senders/:id/test-messages')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireScope('messages:send')
  async sendTestMessage(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
    @Body() dto: SendTestMessageDto,
  ) {
    return this.sessionsService.sendTestMessage(
      brand.id,
      id,
      dto.recipient_phone,
      dto.message,
    );
  }
}
