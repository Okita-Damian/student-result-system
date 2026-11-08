import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { UserRole } from '../generated/prisma/client';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { AcademicSessionsService } from './academic-sessions.service';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { ListAcademicSessionsQueryDto } from './dto/list-academic-session-query.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';

@ApiTags('Academic Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('academic-sessions')
export class AcademicSessionsController {
  constructor(
    private readonly academicSessionsService: AcademicSessionsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create an academic session (admin only)' })
  @ApiCreatedResponse({ description: 'Academic session created.' })
  create(@Body() dto: CreateAcademicSessionDto) {
    return this.academicSessionsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListAcademicSessionsQueryDto) {
    return this.academicSessionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an academic session by ID' })
  @ApiParam({ name: 'id', description: 'Academic session UUID' })
  @ApiOkResponse({ description: 'Academic session retrieved.' })
  @ApiNotFoundResponse({ description: 'Academic session not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicSessionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an academic session (admin only)' })
  @ApiParam({ name: 'id', description: 'Academic session UUID' })
  @ApiOkResponse({ description: 'Academic session updated (admin only).' })
  @ApiNotFoundResponse({ description: 'Academic session not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicSessionDto,
  ) {
    return this.academicSessionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete an academic session (admin only)' })
  @ApiParam({ name: 'id', description: 'Academic session UUID' })
  @ApiOkResponse({ description: 'Academic session deleted.' })
  @ApiNotFoundResponse({ description: 'Academic session not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicSessionsService.remove(id);
  }
}
