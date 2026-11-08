import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UserRole } from 'src/generated/prisma/enums';

import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { AdminsService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin-dto';

@ApiTags('Administrators')
@ApiBearerAuth()
@Controller('admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an administrator (SUPER_ADMIN only)',
  })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminsService.createAdmin(dto);
  }
}
