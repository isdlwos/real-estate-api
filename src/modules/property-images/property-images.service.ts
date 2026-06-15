import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Agent } from '../users/entities/agent.entity';
import { Property } from '../properties/entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';

@Injectable()
export class PropertyImagesService {
  constructor(
    @InjectRepository(PropertyImage) private imageRepo: Repository<PropertyImage>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    private cloudinary: CloudinaryService,
  ) {}

  async uploadImages(
    propertyId: string,
    files: Express.Multer.File[],
    userId: string,
    userRole: Role,
  ): Promise<PropertyImage[]> {
    if (!files?.length) return [];

    await this.checkPropertyOwnership(propertyId, userId, userRole);

    const MAX_IMAGES = 10;
    const existing = await this.imageRepo.countBy({ propertyId });

    if (existing >= MAX_IMAGES) {
      throw new BadRequestException(`Ce bien a déjà atteint le maximum de ${MAX_IMAGES} photos.`);
    }

    const allowed = files.slice(0, MAX_IMAGES - existing);

    const uploaded = await Promise.all(
      allowed.map((file) => this.cloudinary.upload(file, `prestige-immobilier/properties/${propertyId}`)),
    );

    const images = uploaded.map((result, index) =>
      this.imageRepo.create({
        propertyId,
        url: result.secure_url,
        publicId: result.public_id,
        isPrimary: existing === 0 && index === 0,
      }),
    );

    return this.imageRepo.save(images);
  }

  async setPrimary(imageId: string, userId: string, userRole: Role): Promise<PropertyImage> {
    const image = await this.imageRepo.findOneBy({ id: imageId });
    if (!image) throw new NotFoundException('Image not found');

    await this.checkPropertyOwnership(image.propertyId, userId, userRole);

    await this.imageRepo.update({ propertyId: image.propertyId }, { isPrimary: false });
    image.isPrimary = true;
    return this.imageRepo.save(image);
  }

  async remove(imageId: string, userId: string, userRole: Role): Promise<void> {
    const image = await this.imageRepo.findOneBy({ id: imageId });
    if (!image) throw new NotFoundException('Image not found');

    await this.checkPropertyOwnership(image.propertyId, userId, userRole);

    if (image.publicId) {
      await this.cloudinary.delete(image.publicId);
    }

    await this.imageRepo.remove(image);
  }

  private async checkPropertyOwnership(
    propertyId: string,
    userId: string,
    userRole: Role,
  ): Promise<void> {
    if (userRole === Role.ADMIN) return;
    const property = await this.propertyRepo.findOneBy({ id: propertyId });
    if (!property) throw new NotFoundException('Property not found');
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent || property.agentId !== agent.id) {
      throw new ForbiddenException('You do not own this property');
    }
  }
}
