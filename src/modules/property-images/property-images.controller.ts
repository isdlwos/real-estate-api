import {
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { multerConfig } from '../../config/multer.config';
import { PropertyImagesService } from './property-images.service';

@ApiTags('property-images')
@ApiBearerAuth()
@Controller()
export class PropertyImagesController {
  constructor(private propertyImagesService: PropertyImagesService) {}

  @Post('properties/:propertyId/images')
  @Roles(Role.AGENT, Role.ADMIN)
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload images for a property (max 10)' })
  uploadImages(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.propertyImagesService.uploadImages(
      propertyId,
      files,
      userId,
      userRole,
    );
  }

  @Patch('property-images/:id/primary')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Set image as primary' })
  setPrimary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.propertyImagesService.setPrimary(id, userId, userRole);
  }

  @Delete('property-images/:id')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Delete an image' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.propertyImagesService.remove(id, userId, userRole);
  }
}
