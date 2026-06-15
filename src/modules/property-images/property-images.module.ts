import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Agent } from '../users/entities/agent.entity';
import { Property } from '../properties/entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { PropertyImagesController } from './property-images.controller';
import { PropertyImagesService } from './property-images.service';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyImage, Property, Agent]), CloudinaryModule],
  controllers: [PropertyImagesController],
  providers: [PropertyImagesService],
})
export class PropertyImagesModule {}
