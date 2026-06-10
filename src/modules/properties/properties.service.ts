import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { PropertyStatus } from '../../common/enums/property-status.enum';
import { PaginatedResponse } from '../../common/pagination/paginated.response';
import { Agent } from '../users/entities/agent.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { FilterPropertyDto } from './dto/filter-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property } from './entities/property.entity';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
  ) {}

  async create(dto: CreatePropertyDto, userId: string, userRole: Role): Promise<Property> {
    let agentId: string | undefined = undefined;

    if (userRole === Role.AGENT) {
      const agent = await this.agentRepo.findOneBy({ userId });
      if (!agent) throw new ForbiddenException('No agent profile found');
      agentId = agent.id;
    }

    const property = this.propertyRepo.create({ ...dto, agentId, status: PropertyStatus.DRAFT });
    return this.propertyRepo.save(property);
  }

  async findAll(filters: FilterPropertyDto): Promise<PaginatedResponse<Property>> {
    const qb = this.propertyRepo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.images', 'images')
      .leftJoinAndSelect('property.agent', 'agent')
      .leftJoinAndSelect('agent.user', 'agentUser')
      .andWhere('property.status != :draft', { draft: PropertyStatus.DRAFT });

    if (filters.search) {
      qb.andWhere(
        '(LOWER(property.title) LIKE LOWER(:search) OR LOWER(property.description) LIKE LOWER(:search) OR LOWER(property.address) LIKE LOWER(:search) OR LOWER(property.city) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.type) qb.andWhere('property.type = :type', { type: filters.type });
    if (filters.category) qb.andWhere('property.category = :category', { category: filters.category });
    if (filters.status) qb.andWhere('property.status = :status', { status: filters.status });
    if (filters.city) qb.andWhere('LOWER(property.city) LIKE LOWER(:city)', { city: `%${filters.city}%` });
    if (filters.minPrice != null) qb.andWhere('property.price >= :minPrice', { minPrice: filters.minPrice });
    if (filters.maxPrice != null) qb.andWhere('property.price <= :maxPrice', { maxPrice: filters.maxPrice });
    if (filters.minRooms != null) qb.andWhere('property.rooms >= :minRooms', { minRooms: filters.minRooms });
    if (filters.minSurface != null) qb.andWhere('property.surface >= :minSurface', { minSurface: filters.minSurface });

    const sortField = filters.sortBy || 'createdAt';
    const order = filters.order || 'DESC';
    qb.orderBy(`property.${sortField}`, order);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<Property> {
    const property = await this.propertyRepo.findOne({
      where: { id },
      relations: { images: true, agent: { user: true } },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    userId: string,
    userRole: Role,
  ): Promise<Property> {
    const property = await this.findOne(id);
    await this.checkOwnership(property, userId, userRole);
    Object.assign(property, dto);
    return this.propertyRepo.save(property);
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const property = await this.findOne(id);
    await this.checkOwnership(property, userId, userRole);
    await this.propertyRepo.remove(property);
  }

  async getStats() {
    const qb = this.propertyRepo.createQueryBuilder('p');

    const [byCity, byCategory, byType, priceRange] = await Promise.all([
      qb.clone()
        .select('p.city', 'city')
        .addSelect('COUNT(*)', 'count')
        .where('p.status = :status', { status: 'available' })
        .groupBy('p.city')
        .orderBy('count', 'DESC')
        .getRawMany<{ city: string; count: string }>(),

      qb.clone()
        .select('p.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('p.status = :status', { status: 'available' })
        .groupBy('p.category')
        .getRawMany<{ category: string; count: string }>(),

      qb.clone()
        .select('p.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('p.status = :status', { status: 'available' })
        .groupBy('p.type')
        .getRawMany<{ type: string; count: string }>(),

      qb.clone()
        .select('MIN(p.price)', 'min')
        .addSelect('MAX(p.price)', 'max')
        .addSelect('ROUND(AVG(p.price)::numeric, 2)', 'avg')
        .addSelect('COUNT(*)', 'total')
        .where('p.status = :status', { status: 'available' })
        .getRawOne<{ min: string; max: string; avg: string; total: string }>(),
    ]);

    return {
      byCity: byCity.map((r) => ({ city: r.city, count: Number(r.count) })),
      byCategory: byCategory.map((r) => ({ category: r.category, count: Number(r.count) })),
      byType: byType.map((r) => ({ type: r.type, count: Number(r.count) })),
      price: {
        min: Number(priceRange?.min ?? 0),
        max: Number(priceRange?.max ?? 0),
        avg: Number(priceRange?.avg ?? 0),
        total: Number(priceRange?.total ?? 0),
      },
    };
  }

  async getCities(): Promise<{ city: string; count: number }[]> {
    const rows = await this.propertyRepo
      .createQueryBuilder('p')
      .select('p.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('p.status = :status', { status: 'available' })
      .groupBy('p.city')
      .orderBy('count', 'DESC')
      .getRawMany<{ city: string; count: string }>();
    return rows.map((r) => ({ city: r.city, count: Number(r.count) }));
  }

  async findSimilar(id: string): Promise<Property[]> {
    const property = await this.findOne(id);

    return this.propertyRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.id != :id', { id })
      .andWhere('p.status = :status', { status: 'available' })
      .andWhere('p.category = :category', { category: property.category })
      .andWhere('p.type = :type', { type: property.type })
      .andWhere('p.price BETWEEN :min AND :max', {
        min: Number(property.price) * 0.7,
        max: Number(property.price) * 1.3,
      })
      .orderBy('ABS(p.price - :price)', 'ASC')
      .setParameter('price', property.price)
      .limit(6)
      .getMany();
  }

  private async checkOwnership(property: Property, userId: string, userRole: Role): Promise<void> {
    if (userRole === Role.ADMIN) return;
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent || property.agentId !== agent.id) {
      throw new ForbiddenException('You do not own this property');
    }
  }
}
