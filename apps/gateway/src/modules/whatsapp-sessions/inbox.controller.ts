import { BadRequestException, Body, Controller, Get, Header, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentBrand } from '../../common/decorators/brand.decorator';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { Brand } from '../brands/entities/brand.entity';
import { InboxService } from './inbox.service';

@Controller('v1/senders/:senderId/chats')
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @RequireScope('senders:write')
  list(@CurrentBrand() brand: Brand, @Param('senderId', ParseUUIDPipe) senderId: string) {
    return this.inbox.conversations(brand, senderId);
  }

  @Get(':peerId/messages')
  @Header('Cache-Control', 'private, no-store')
  @RequireScope('senders:write')
  messages(@CurrentBrand() brand: Brand, @Param('senderId', ParseUUIDPipe) senderId: string, @Param('peerId') peerId: string) {
    return this.inbox.messages(brand, senderId, peerId);
  }

  @Post(':peerId/messages')
  @Header('Cache-Control', 'private, no-store')
  @RequireScope('senders:write', 'messages:send')
  reply(@CurrentBrand() brand: Brand, @Param('senderId', ParseUUIDPipe) senderId: string, @Param('peerId') peerId: string, @Body('text') text: unknown) {
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) {
      throw new BadRequestException('Isi pesan wajib diisi, maksimal 2000 karakter.');
    }
    return this.inbox.reply(brand, senderId, peerId, text.trim());
  }
}
