import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, Not, Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { PaginatedResponse } from '../../common/pagination/paginated.response';
import { Property } from '../properties/entities/property.entity';
import { PropertyStatus } from '../../common/enums/property-status.enum';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Agent } from './entities/agent.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(Subscription) private subscriptionRepo: Repository<Subscription>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, password: hashed });
    return this.userRepo.save(user);
  }

  async findAll(page = 1, limit = 20, role?: Role): Promise<PaginatedResponse<User>> {
    const [data, total] = await this.userRepo.findAndCount({
      where: role ? { role } : undefined,
      relations: { agentProfile: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new PaginatedResponse(data, total, page, limit);
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { agentProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      select: { id: true, email: true, password: true, role: true, firstName: true, lastName: true, refreshTokenHash: true },
    });
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string, requesterRole: Role): Promise<User> {
    const user = await this.findOneById(id);
    if (requesterRole !== Role.ADMIN && requesterId !== id) {
      throw new ForbiddenException();
    }
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async updateAvatar(id: string, avatarPath: string): Promise<User> {
    const user = await this.findOneById(id);
    user.avatar = avatarPath;
    return this.userRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOneById(id);
    await this.userRepo.remove(user);
  }

  async updateRefreshToken(userId: string, rawToken: string | null): Promise<void> {
    const hash = rawToken ? await bcrypt.hash(rawToken, 10) : null;
    await this.userRepo.update(userId, { refreshTokenHash: hash });
  }

  async setPasswordResetToken(email: string): Promise<{ token: string; user: User } | null> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) return null;

    const { randomBytes } = await import('crypto');
    const rawToken = randomBytes(32).toString('hex');
    const hashed = await bcrypt.hash(rawToken, 10);
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepo.update(user.id, {
      passwordResetToken: hashed,
      passwordResetExpiry: expiry,
    });

    return { token: rawToken, user };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const users = await this.userRepo.find({
      where: { passwordResetToken: Not(IsNull()) },
      select: { id: true, passwordResetToken: true, passwordResetExpiry: true },
    });

    let matched: User | null = null;
    for (const u of users) {
      if (u.passwordResetToken && await bcrypt.compare(rawToken, u.passwordResetToken)) {
        matched = u;
        break;
      }
    }

    if (!matched) throw new BadRequestException('Invalid or expired reset token');
    if (!matched.passwordResetExpiry || matched.passwordResetExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(matched.id, {
      password: hashed,
      passwordResetToken: null,
      passwordResetExpiry: null,
      refreshTokenHash: null,
    });
  }

  async promoteToAgent(userId: string, dto: UpdateAgentDto): Promise<Agent> {
    const user = await this.findOneById(userId);
    const existing = await this.agentRepo.findOneBy({ userId });
    if (existing) throw new ConflictException('User is already an agent');

    user.role = Role.AGENT;
    await this.userRepo.save(user);

    const agent = this.agentRepo.create({ userId, ...dto });
    return this.agentRepo.save(agent);
  }

  async updateAgentProfile(userId: string, dto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent) throw new NotFoundException('Agent profile not found');
    Object.assign(agent, dto);
    return this.agentRepo.save(agent);
  }

  async getAgentProfile(userId: string): Promise<Agent & { activeSubscription?: { planName: string; planSlug: string } }> {
    const agent = await this.agentRepo.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (!agent) throw new NotFoundException('Agent profile not found');

    const subscription = await this.subscriptionRepo.findOne({
      where: { agentId: userId, status: SubscriptionStatus.ACTIVE },
      relations: { plan: true },
    });

    if (subscription?.plan) {
      (agent as any).activeSubscription = {
        planName: subscription.plan.name,
        planSlug: subscription.plan.slug,
      };
    }

    return agent;
  }

  async getMyProperties(userId: string, page = 1, limit = 20, status?: PropertyStatus): Promise<PaginatedResponse<Property>> {
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent) throw new NotFoundException('Agent profile not found');

    const [data, total] = await this.propertyRepo.findAndCount({
      where: { agentId: agent.id, ...(status && { status }) },
      relations: { images: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new PaginatedResponse(data, total, page, limit);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(userId, { password: hashed, refreshTokenHash: null });
  }

  async findAllAgents(page = 1, limit = 20, diasporaOnly: boolean | string = false): Promise<PaginatedResponse<Agent>> {
    // enableImplicitConversion converts 'false' → Boolean('false') = true, so compare strictly
    const filterDiaspora = diasporaOnly === true || diasporaOnly === 'true';
    const qb = this.agentRepo
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.user', 'user')
      .orderBy('agent.isDiasporaSpecialist', 'DESC')
      .addOrderBy('user.firstName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filterDiaspora) qb.where('agent.isDiasporaSpecialist = true');

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, page, limit);
  }

  async toggleDiasporaSpecialist(userId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent) throw new NotFoundException('Agent profile not found');
    agent.isDiasporaSpecialist = !agent.isDiasporaSpecialist;
    return this.agentRepo.save(agent);
  }

  async getAgentProperties(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<Property>> {
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent) throw new NotFoundException('Agent profile not found');

    const [data, total] = await this.propertyRepo.findAndCount({
      where: { agentId: agent.id, status: PropertyStatus.AVAILABLE },
      relations: { images: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponse(data, total, page, limit);
  }
}
