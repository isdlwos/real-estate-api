import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Agent } from '../users/entities/agent.entity';
import { Property } from '../properties/entities/property.entity';
import { PropertyTour } from './entities/property-tour.entity';
import { PropertyToursController } from './property-tours.controller';
import { PropertyToursService } from './property-tours.service';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyTour, Property, Agent]), CloudinaryModule],
  controllers: [PropertyToursController],
  providers: [PropertyToursService],
})
export class PropertyToursModule {}
