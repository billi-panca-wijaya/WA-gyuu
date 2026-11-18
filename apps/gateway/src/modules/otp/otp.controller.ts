import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { OtpService } from './otp.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { ResendChallengeDto } from './dto/resend-challenge.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { BrandAuthGuard } from '../authentication/guards/brand-auth.guard';
import { CurrentBrand } from '../../common/decorators/brand.decorator';
import { BrandEntity } from '../brands/entities/brand.entity';
import { RequireScope } from '../../common/decorators/require-scope.decorator';

@Controller('v1')
@UseGuards(BrandAuthGuard)
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('otp/challenges')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireScope('otp:create')
  async createChallenge(
    @CurrentBrand() brand: BrandEntity,
    @Body() dto: CreateChallengeDto,
  ) {
    return this.otpService.createChallenge(brand, dto);
  }

  @Get('otp/challenges/:id')
  @RequireScope('otp:read')
  async getChallengeStatus(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
  ) {
    return this.otpService.getChallengeStatus(brand.id, id);
  }

  @Post('otp/challenges/:id/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireScope('otp:create')
  async resendChallenge(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
    @Body() dto: ResendChallengeDto,
  ) {
    return this.otpService.resendChallenge(brand, id, dto);
  }

  @Post('otp/challenges/:id/verify')
  @HttpCode(HttpStatus.OK)
  @RequireScope('otp:verify')
  async verifyOtp(
    @CurrentBrand() brand: BrandEntity,
    @Param('id') id: string,
    @Body() dto: VerifyOtpDto,
  ) {
    return this.otpService.verifyOtp(brand, id, dto);
  }

  @Get('logs')
  @RequireScope('logs:read')
  async getLogs(
    @CurrentBrand() brand: BrandEntity,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.otpService.getSanitizedLogs(
      brand.id,
      Number(page),
      Number(limit),
    );
  }
}
