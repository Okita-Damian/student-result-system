import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiForbiddenResponse,
  ApiResponse,
} from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../guards/jwt-auth-guard';
import { JwtAuthGuard } from '../guards/jwt-auth-guard';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateStudentLevelDto } from './dto/update-student-level.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({ description: 'Returns the current user profile.' })
  getMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.getMe(req.user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiOkResponse({ description: 'Profile updated successfully.' })
  updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(req.user.sub, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete the authenticated user account' })
  @ApiOkResponse({ description: 'Account deleted successfully.' })
  deleteMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.deleteMe(req.user.sub);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List users (admin only)' })
  @ApiForbiddenResponse({ description: 'Admin privileges are required.' })
  getAllUsers(@Query() query: ListUsersDto) {
    return this.usersService.getAllUsers(query);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  @ApiForbiddenResponse({ description: 'Admin privileges are required.' })
  deleteUser(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.adminDeleteUser(id, req.user.sub);
  }

  @Patch('me/level')
  @ApiOperation({ summary: 'Select or update my academic level' })
  @ApiResponse({
    status: 200,
    description: 'Academic level updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({
    status: 403,
    description: 'Only eligible students can select a level',
  })
  async updateStudentLevel(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateStudentLevelDto,
  ) {
    return this.usersService.updateStudentLevel(req.user.sub, dto);
  }
}
