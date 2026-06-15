import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PropertyToursService } from './property-tours.service';

const tourMulterConfig = {
  storage: memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB pour les panoramas
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
};

@ApiTags('property-tours')
@Controller()
export class PropertyToursController {
  constructor(private propertyToursService: PropertyToursService) {}

  @Post('properties/:propertyId/tours')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', tourMulterConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a 360° panorama for a property' })
  upload(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string | undefined,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.propertyToursService.upload(propertyId, file, title, userId, userRole);
  }

  @Get('properties/:propertyId/tours')
  @Public()
  @ApiOperation({ summary: 'List 360° tours for a property' })
  findByProperty(@Param('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.propertyToursService.findByProperty(propertyId);
  }

  @Delete('property-tours/:id')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a 360° tour' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.propertyToursService.remove(id, userId, userRole);
  }
}
