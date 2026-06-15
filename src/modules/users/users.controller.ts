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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

class AgentsFilterDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  diasporaOnly?: boolean;
}
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { MyPropertiesFilterDto } from './dto/my-properties-filter.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users (admin, paginated)' })
  findAll(@Query() query: ListUsersDto) {
    return this.usersService.findAll(query.page, query.limit, query.role);
  }

  @Get('agents')
  @Public()
  @ApiOperation({ summary: 'List all agents with their profile (public, paginated)' })
  findAllAgents(@Query() query: AgentsFilterDto) {
    return this.usersService.findAllAgents(query.page, query.limit, query.diasporaOnly);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findOneById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(userId, dto, userId, Role.CLIENT);
  }

  @Get('me/properties')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: "Get own properties — all statuses (agent dashboard)" })
  getMyProperties(
    @CurrentUser('id') userId: string,
    @Query() query: MyPropertiesFilterDto,
  ) {
    return this.usersService.getMyProperties(userId, query.page, query.limit, query.status);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change own password (invalidates all sessions)' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Patch('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 2_000_000 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload own avatar' })
  uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(userId, `/uploads/avatars/${file.filename}`);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by id (admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOneById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.usersService.update(id, dto, requesterId, Role.ADMIN);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user (admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Post(':id/promote-agent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Promote user to agent role (admin)' })
  promoteToAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.usersService.promoteToAgent(id, dto);
  }

  @Patch(':id/diaspora-specialist')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle diaspora specialist flag on an agent (admin)' })
  toggleDiasporaSpecialist(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.toggleDiasporaSpecialist(id);
  }

  @Get(':id/agent-profile')
  @Public()
  @ApiOperation({ summary: 'Get public agent profile' })
  getAgentProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getAgentProfile(id);
  }

  @Get(':id/properties')
  @Public()
  @ApiOperation({ summary: "Get agent's available properties (public)" })
  getAgentProperties(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.usersService.getAgentProperties(id, pagination.page, pagination.limit);
  }

  @Patch('me/agent-profile')
  @Roles(Role.AGENT)
  @ApiOperation({ summary: 'Update own agent profile' })
  updateAgentProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.usersService.updateAgentProfile(userId, dto);
  }
}
