import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Property } from '../properties/entities/property.entity';
import { Agent } from '../users/entities/agent.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(Appointment) private appointmentRepo: Repository<Appointment>,
  ) {}

  async getStats() {
    const [usersByRole, propertiesByStatus, appointmentsByStatus, agentCount] =
      await Promise.all([
        this.userRepo
          .createQueryBuilder('u')
          .select('u.role', 'role')
          .addSelect('COUNT(*)', 'count')
          .groupBy('u.role')
          .getRawMany<{ role: string; count: string }>(),

        this.propertyRepo
          .createQueryBuilder('p')
          .select('p.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('p.status')
          .getRawMany<{ status: string; count: string }>(),

        this.appointmentRepo
          .createQueryBuilder('a')
          .select('a.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('a.status')
          .getRawMany<{ status: string; count: string }>(),

        this.agentRepo.count(),
      ]);

    return {
      users: {
        total: usersByRole.reduce((s, r) => s + Number(r.count), 0),
        byRole: Object.fromEntries(usersByRole.map((r) => [r.role, Number(r.count)])),
      },
      agents: { total: agentCount },
      properties: {
        total: propertiesByStatus.reduce((s, r) => s + Number(r.count), 0),
        byStatus: Object.fromEntries(propertiesByStatus.map((r) => [r.status, Number(r.count)])),
      },
      appointments: {
        total: appointmentsByStatus.reduce((s, r) => s + Number(r.count), 0),
        byStatus: Object.fromEntries(appointmentsByStatus.map((r) => [r.status, Number(r.count)])),
      },
    };
  }
}
