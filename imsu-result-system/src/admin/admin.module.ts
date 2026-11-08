import { Module } from '@nestjs/common';

import { AdminsController } from './admin.controller';
import { AdminsService } from './admin.service';

@Module({
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
