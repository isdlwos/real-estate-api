import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Agent } from '../users/entities/agent.entity';
import { Property } from '../properties/entities/property.entity';
import { PropertyTour } from './entities/property-tour.entity';

@Injectable()
export class PropertyToursService {
  constructor(
    @InjectRepository(PropertyTour) private tourRepo: Repository<PropertyTour>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    private cloudinary: CloudinaryService,
  ) {}

  async upload(
    propertyId: string,
    file: Express.Multer.File,
    title: string | undefined,
    userId: string,
    userRole: Role,
  ): Promise<PropertyTour> {
    await this.checkOwnership(propertyId, userId, userRole);

    const result = await this.cloudinary.upload(file, `prestige-immobilier/tours/${propertyId}`);

    return this.tourRepo.save(
      this.tourRepo.create({
        propertyId,
        title: title ?? null,
        imageUrl: result.secure_url,
        publicId: result.public_id,
      }),
    );
  }

  findByProperty(propertyId: string): Promise<PropertyTour[]> {
    return this.tourRepo.find({
      where: { propertyId },
      order: { createdAt: 'ASC' },
    });
  }

  async remove(tourId: string, userId: string, userRole: Role): Promise<void> {
    const tour = await this.tourRepo.findOneBy({ id: tourId });
    if (!tour) throw new NotFoundException('Tour not found');

    await this.checkOwnership(tour.propertyId, userId, userRole);

    if (tour.publicId) await this.cloudinary.delete(tour.publicId);
    await this.tourRepo.remove(tour);
  }

  private async checkOwnership(propertyId: string, userId: string, userRole: Role): Promise<void> {
    if (userRole === Role.ADMIN) return;
    const property = await this.propertyRepo.findOneBy({ id: propertyId });
    if (!property) throw new NotFoundException('Property not found');
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent || property.agentId !== agent.id) throw new ForbiddenException();
  }
}
