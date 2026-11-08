import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  UseGuards,
  Query,
  Delete,
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
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';
import { ListFacultiesQueryDto } from './dto/list-faculty-query.dto';
import { FacultiesService } from './faculties.service';

import { UserRole } from '../generated/prisma/client';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Faculties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('faculties')
export class FacultiesController {
  constructor(private readonly facultiesService: FacultiesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new faculty (admin only)' })
  @ApiCreatedResponse({ description: 'Faculty successfully created.' })
  create(@Body() dto: CreateFacultyDto) {
    return this.facultiesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListFacultiesQueryDto) {
    return this.facultiesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a faculty by ID' })
  @ApiParam({ name: 'id', description: 'Faculty UUID' })
  @ApiOkResponse({ description: 'Faculty found.' })
  @ApiNotFoundResponse({ description: 'Faculty not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.facultiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a faculty (admin only)' })
  @ApiParam({ name: 'id', description: 'Faculty UUID' })
  @ApiOkResponse({ description: 'Faculty successfully updated.' })
  @ApiNotFoundResponse({ description: 'Faculty not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacultyDto,
  ) {
    return this.facultiesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a faculty (admin only)' })
  @ApiParam({ name: 'id', description: 'Faculty UUID' })
  @ApiOkResponse({ description: 'Faculty successfully deleted.' })
  @ApiNotFoundResponse({ description: 'Faculty not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.facultiesService.remove(id);
  }
}
