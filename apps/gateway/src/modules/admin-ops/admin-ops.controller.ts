import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OpsAuthGuard } from '../platform-auth/guards/ops-auth.guard';
import { OpsAuth } from '../platform-auth/decorators/ops-auth.decorator';
import { CurrentPlatformUser } from '../platform-auth/decorators/current-user.decorator';
import { PlatformUser, PlatformRole, PlatformUserStatus } from '../platform-auth/entities/platform-user.entity';
import { AdminOpsService } from './admin-ops.service';
import { PlatformAuthService } from '../platform-auth/platform-auth.service';
import { AuditService } from '../audit/audit.service';

@Controller('v1/ops')
@UseGuards(OpsAuthGuard)
export class AdminOpsController {
  constructor(
    private readonly opsService: AdminOpsService,
    private readonly platformAuthService: PlatformAuthService,
    private readonly auditService: AuditService,
  ) {}

  // -------------------------------------------------------------
  // Summary & Health
  // -------------------------------------------------------------
  @Get('summary')
  @OpsAuth({ requireRole: 'viewer' })
  async getSummary() {
    const data = await this.opsService.getSummary();
    return { data };
  }

  @Get('system-health')
  @OpsAuth({ requireRole: 'viewer' })
  async getSystemHealth() {
    const data = await this.opsService.getSystemHealth();
    return { data };
  }

  // -------------------------------------------------------------
  // Brands
  // -------------------------------------------------------------
  @Get('brands')
  @OpsAuth({ requireRole: 'viewer' })
  async listBrands() {
    const data = await this.opsService.listBrands();
    return { data };
  }

  @Post('brands')
  @OpsAuth({ requireRole: 'superadmin' })
  @HttpCode(HttpStatus.CREATED)
  async createBrand(
    @CurrentPlatformUser() actor: PlatformUser,
    @Body() dto: { code: string; name: string; domain?: string; environment?: string; notes?: string },
  ) {
    const data = await this.opsService.createBrand(actor, dto);
    return { data };
  }

  @Get('brands/:id')
  @OpsAuth({ requireRole: 'viewer' })
  async getBrandDetail(@Param('id') id: string) {
    const data = await this.opsService.getBrandDetail(id);
    return { data };
  }

  @Patch('brands/:id')
  @OpsAuth({ requireRole: 'operator' })
  async updateBrand(
    @CurrentPlatformUser() actor: PlatformUser,
    @Param('id') id: string,
    @Body() dto: { name?: string; domain?: string; environment?: string; notes?: string },
  ) {
    const data = await this.opsService.updateBrand(actor, id, dto);
    return { data };
  }

  @Post('brands/:id/pause')
  @OpsAuth({ requireRole: 'superadmin', requireElevated: true })
  @HttpCode(HttpStatus.OK)
  async pauseBrand(
    @CurrentPlatformUser() actor: PlatformUser,
    @Param('id') id: string,
  ) {
    const data = await this.opsService.setBrandStatus(actor, id, false);
    return { data };
  }

  @Post('brands/:id/resume')
  @OpsAuth({ requireRole: 'superadmin', requireElevated: true })
  @HttpCode(HttpStatus.OK)
  async resumeBrand(
    @CurrentPlatformUser() actor: PlatformUser,
    @Param('id') id: string,
  ) {
    const data = await this.opsService.setBrandStatus(actor, id, true);
    return { data };
  }

  @Delete('brands/:id')
  @OpsAuth({ requireRole: 'superadmin', requireElevated: true })
  @HttpCode(HttpStatus.OK)
  async deleteBrand(
    @CurrentPlatformUser() actor: PlatformUser,
    @Param('id') id: string,
  ) {
    const data = await this.opsService.deleteBrand(actor, id);
    return { data };
  }

  // -------------------------------------------------------------
  // API Keys (Named, Scoped, One-time reveal, Rotate, Revoke)
  // -------------------------------------------------------------
  @Get('api-keys')
  @OpsAuth({ requireRole: 'viewer' })
  async listApiKeys(@Query('brand_id') brandId?: string) {
    const data = await this.opsService.listApiKeys(brandId);
    return { data };
  }

  @Post('api-keys')
  @OpsAuth({ requireRole: 'superadmin', requireElevated: true })
  @HttpCode(HttpStatus.CREATED)
  async generateApiKey(
    @CurrentPlatformUser() actor: PlatformUser,
    @Body() dto: {
      brand_id: string;
      name: string;
      environment?: string;
      scopes: string[];
      expires_in_days?: number;
      notes?: string;
    },
  ) {
    const data = await this.opsService.generateApiKey(actor, dto);
    return { data };
  }

  @Post('api-keys/:id/rotate')
  @OpsAuth({ requireRole: 'superadmin', requireElevated: true })
  @HttpCode(HttpStatus.OK)
  async rotateApiKey(
    @CurrentPlatformUser() actor: PlatformUser,
    @Param('id') id: string,
    @Body() body: { grace_period_minutes?: number; reason?: string },
  ) {
    const data = await this.opsService.rotateApiKey(actor, id, body);
    return { data };
  }

  @Post('api-keys/:id/revoke')
  @OpsAuth({ requireRole: 'superadmin', requireElevated: true })
  @HttpCode(HttpStatus.OK)
  async revokeApiKey(
    @CurrentPlatformUser() actor: PlatformUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const data = await this.opsService.revokeApiKey(actor, id, body.reason || 'Manual revocation via IT Portal');
    return { data };
  }

  @Patch('api-keys/:id')
  @OpsAuth({ requireRole: 'operator' })
  async updateApiKey(
    @CurrentPlatformUser() actor: PlatformUser,
    @Param('id') id: string,
    @Body() body: { name?: string; notes?: string },
  ) {
    const data = await this.opsService.updateApiKey(actor, id, body);
    return { data };
  }

  // -------------------------------------------------------------
  // WhatsApp Senders
  // -------------------------------------------------------------
  @Get('senders')
  @OpsAuth({ requireRole: 'viewer' })
  async listSenders(@Query('brand_id') brandId?: string) {
    const data = await this.opsService.listSenders(brandId);
    return { data };
  }

  @Post('senders/:id/action')
  @OpsAuth({ requireRole: 'operator', requireElevated: true })
  @HttpCode(HttpStatus.OK)
  async senderAction(
    @CurrentPlatformUser() actor: PlatformUser,
    @Param('id') id: string,
    @Body() body: { action: 'disconnect' | 'toggle_otp'; reason?: string },
  ) {
    const data = await this.opsService.senderAction(actor, id, body.action, body.reason);
    return { data };
  }

  // -------------------------------------------------------------
  // OTP Transactions & Queue
  // -------------------------------------------------------------
  @Get('otp/transactions')
  @OpsAuth({ requireRole: 'viewer' })
  async listOtpTransactions(
    @Query('brand_id') brandId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.opsService.listOtpTransactions({
      brandId,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { data };
  }

  @Get('otp/queue')
  @OpsAuth({ requireRole: 'viewer' })
  async listDeliveriesQueue(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.opsService.listDeliveriesQueue({
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { data };
  }

  // -------------------------------------------------------------
  // Logs & Audit
  // -------------------------------------------------------------
  @Get('logs/api')
  @OpsAuth({ requireRole: 'viewer' })
  async listApiLogs(@Query() query: any) {
    const data = await this.auditService.listLogs({
      category: 'api',
      limit: query.limit ? parseInt(query.limit, 10) : 50,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
      entityType: query.entity_type,
    });
    return { data };
  }

  @Get('logs/admin')
  @OpsAuth({ requireRole: 'viewer' })
  async listAdminLogs(@Query() query: any) {
    const data = await this.auditService.listLogs({
      category: 'admin',
      limit: query.limit ? parseInt(query.limit, 10) : 50,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
      actorUsername: query.actor,
    });
    return { data };
  }

  @Get('logs/security')
  @OpsAuth({ requireRole: 'superadmin' })
  async listSecurityLogs(@Query() query: any) {
    const data = await this.auditService.listLogs({
      category: 'security',
      limit: query.limit ? parseInt(query.limit, 10) : 50,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    });
    return { data };
  }

  // -------------------------------------------------------------
  // IT Users & Access
  // -------------------------------------------------------------
  @Get('users')
  @OpsAuth({ requireRole: 'superadmin' })
  async listUsers() {
    const data = await this.platformAuthService.listUsers();
    return { data };
  }

  @Post('users')
  @OpsAuth({ requireRole: 'superadmin' })
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @CurrentPlatformUser() actor: PlatformUser,
    @Body() body: { username: string; email: string; fullName: string; role: PlatformRole; password: string },
  ) {
    const data = await this.platformAuthService.createUser(actor, body);
    return { data };
  }

  @Patch('users/:id')
  @OpsAuth({ requireRole: 'superadmin' })
  async updateUser(
    @CurrentPlatformUser() actor: PlatformUser,
    @Param('id') id: string,
    @Body() body: { role?: PlatformRole; status?: PlatformUserStatus; fullName?: string },
  ) {
    const data = await this.platformAuthService.updateUser(actor, id, body);
    return { data };
  }
}
