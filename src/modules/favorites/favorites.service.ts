import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/pagination/paginated.response';
import { Favorite } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private favoriteRepo: Repository<Favorite>,
  ) {}

  async add(propertyId: string, userId: string): Promise<Favorite> {
    try {
      const favorite = this.favoriteRepo.create({ userId, propertyId });
      return await this.favoriteRepo.save(favorite);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as { code?: string }).code === '23505') {
        throw new ConflictException('Property already in favorites');
      }
      throw err;
    }
  }

  async remove(propertyId: string, userId: string): Promise<void> {
    const favorite = await this.favoriteRepo.findOneBy({ userId, propertyId });
    if (!favorite) throw new NotFoundException('Favorite not found');
    await this.favoriteRepo.remove(favorite);
  }

  async isFavorited(userId: string, propertyId: string): Promise<{ favorited: boolean }> {
    const count = await this.favoriteRepo.countBy({ userId, propertyId });
    return { favorited: count > 0 };
  }

  async findAll(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<Favorite>> {
    const [data, total] = await this.favoriteRepo.findAndCount({
      where: { userId },
      relations: { property: { images: true } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new PaginatedResponse(data, total, page, limit);
  }
}
