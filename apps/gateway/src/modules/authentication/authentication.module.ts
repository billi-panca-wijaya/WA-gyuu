import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BrandsModule } from '../brands/brands.module';
import { BrandAuthGuard } from './guards/brand-auth.guard';

@Global()
@Module({
  imports: [BrandsModule],
  providers: [
    BrandAuthGuard,
    {
      provide: APP_GUARD,
      useClass: BrandAuthGuard,
    },
  ],
  exports: [BrandAuthGuard],
})
export class AuthenticationModule {}
