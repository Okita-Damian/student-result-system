import { Module } from '@nestjs/common';

import { FacultiesController } from './faculties.controller';
import { FacultiesService } from './faculties.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FacultiesController],
  providers: [FacultiesService],
})
export class FacultiesModule {}
