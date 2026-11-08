import {
  Body,
  Controller,
  Delete,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
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

import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { ListDepartmentsQueryDto } from './dto/list-department-query.dto';

import { DepartmentsService } from './departments.service';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a department (admin only)' })
  @ApiCreatedResponse({ description: 'Department created successfully.' })
  @ApiNotFoundResponse({ description: 'Faculty not found.' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.CreateDepartment(dto);
  }

  @Get()
  findAll(@Query() query: ListDepartmentsQueryDto) {
    return this.departmentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a department by ID' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiNotFoundResponse({ description: 'Department not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.FindOneDepartment(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a department (admin only)' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiOkResponse({ description: 'Department updated successfully.' })
  @ApiNotFoundResponse({ description: 'Department or faculty not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.UpdateDepartment(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a department (admin only)' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  @ApiNotFoundResponse({ description: 'Department not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.RemoveDepartment(id);
  }
}
