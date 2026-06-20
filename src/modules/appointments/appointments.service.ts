import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { Role } from '../../common/enums/role.enum';
import { PaginatedResponse } from '../../common/pagination/paginated.response';
import { MailService } from '../mail/mail.service';
import { Agent } from '../users/entities/agent.entity';
import { User } from '../users/entities/user.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment } from './entities/appointment.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private mailService: MailService,
  ) {}

  async create(
    dto: CreateAppointmentDto,
    clientId: string,
  ): Promise<Appointment> {
    await this.checkDoubleBooking(dto.agentId, dto.date);

    const appointment = this.appointmentRepo.create({ ...dto, clientId });
    const saved = await this.appointmentRepo.save(appointment);
    this.notifyAgentNewAppointment(saved, clientId).catch(() => {});
    return saved;
  }

  async findAll(
    userId: string,
    userRole: Role,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Appointment>> {
    const qb = this.appointmentRepo
      .createQueryBuilder('appt')
      .leftJoinAndSelect('appt.property', 'property')
      .leftJoinAndSelect('appt.agent', 'agent')
      .leftJoinAndSelect('agent.user', 'agentUser')
      .leftJoinAndSelect('appt.client', 'client')
      .orderBy('appt.date', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userRole === Role.AGENT) {
      const agent = await this.agentRepo.findOneBy({ userId });
      if (!agent) return new PaginatedResponse([], 0, page, limit);
      qb.where('appt.agentId = :agentId', { agentId: agent.id });
    } else if (userRole !== Role.ADMIN) {
      qb.where('appt.clientId = :clientId', { clientId: userId });
    }

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, page, limit);
  }

  async findOne(
    id: string,
    userId: string,
    userRole: Role,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: { property: true, agent: { user: true }, client: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (userRole !== Role.ADMIN) {
      const agent =
        userRole === Role.AGENT
          ? await this.agentRepo.findOneBy({ userId })
          : null;

      const isOwner =
        appointment.clientId === userId ||
        (agent && appointment.agentId === agent.id);

      if (!isOwner) throw new ForbiddenException();
    }

    return appointment;
  }

  async updateStatus(
    id: string,
    dto: UpdateAppointmentDto,
    userId: string,
    userRole: Role,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOneBy({ id });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (userRole !== Role.ADMIN) {
      const agent = await this.agentRepo.findOneBy({ userId });
      if (!agent || appointment.agentId !== agent.id) {
        throw new ForbiddenException(
          'Only the assigned agent can update appointment status',
        );
      }
    }

    appointment.status = dto.status;
    const saved = await this.appointmentRepo.save(appointment);
    if (dto.status === AppointmentStatus.CONFIRMED) {
      this.notifyClientConfirmation(saved).catch(() => {});
    }
    return saved;
  }

  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    userId: string,
    userRole: Role,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOneBy({ id });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (userRole !== Role.ADMIN) {
      if (appointment.clientId !== userId) throw new ForbiddenException();
      if (appointment.status !== AppointmentStatus.PENDING) {
        throw new BadRequestException(
          'Only pending appointments can be rescheduled',
        );
      }
    }

    await this.checkDoubleBooking(appointment.agentId, dto.date);

    appointment.date = dto.date;
    if (dto.notes !== undefined) appointment.notes = dto.notes;
    appointment.status = AppointmentStatus.PENDING;
    const saved = await this.appointmentRepo.save(appointment);
    this.notifyAgentRescheduled(saved).catch(() => {});
    return saved;
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const appointment = await this.appointmentRepo.findOneBy({ id });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (userRole !== Role.ADMIN) {
      if (
        appointment.clientId !== userId ||
        appointment.status !== AppointmentStatus.PENDING
      ) {
        throw new ForbiddenException(
          'Clients can only cancel their own pending appointments',
        );
      }
    }

    this.notifyAgentCancelled(appointment).catch(() => {});
    await this.appointmentRepo.remove(appointment);
  }

  private async notifyAgentNewAppointment(
    appointment: Appointment,
    clientId: string,
  ): Promise<void> {
    const [agent, client] = await Promise.all([
      this.agentRepo.findOne({
        where: { id: appointment.agentId },
        relations: { user: true },
      }),
      this.userRepo.findOneBy({ id: clientId }),
    ]);
    if (!agent?.user?.email) return;
    await this.mailService.sendNewAppointment({
      to: agent.user.email,
      agentFirstName: agent.user.firstName,
      clientName: client
        ? `${client.firstName} ${client.lastName}`
        : 'Un client',
      date: appointment.date,
    });
  }

  private async notifyClientConfirmation(
    appointment: Appointment,
  ): Promise<void> {
    const [client, agent] = await Promise.all([
      this.userRepo.findOneBy({ id: appointment.clientId }),
      this.agentRepo.findOne({
        where: { id: appointment.agentId },
        relations: { user: true },
      }),
    ]);
    if (!client?.email) return;
    await this.mailService.sendAppointmentConfirmed({
      to: client.email,
      clientFirstName: client.firstName,
      agentName: agent?.user
        ? `${agent.user.firstName} ${agent.user.lastName}`
        : 'Votre agent',
      date: appointment.date,
    });
  }

  private async notifyAgentRescheduled(appointment: Appointment): Promise<void> {
    const agent = await this.agentRepo.findOne({
      where: { id: appointment.agentId },
      relations: { user: true },
    });
    if (!agent?.user?.email) return;
    await this.mailService.sendAppointmentRescheduled({
      to: agent.user.email,
      recipientName: agent.user.firstName,
      newDate: appointment.date,
    });
  }

  private async notifyAgentCancelled(appointment: Appointment): Promise<void> {
    const agent = await this.agentRepo.findOne({
      where: { id: appointment.agentId },
      relations: { user: true },
    });
    if (!agent?.user?.email) return;
    await this.mailService.sendAppointmentCancelled({
      to: agent.user.email,
      recipientName: agent.user.firstName,
      date: appointment.date,
      cancelledBy: 'client',
    });
  }

  private async checkDoubleBooking(agentId: string, date: Date): Promise<void> {
    const windowStart = new Date(date.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(date.getTime() + 60 * 60 * 1000);

    const conflict = await this.appointmentRepo.findOne({
      where: {
        agentId,
        status: AppointmentStatus.CONFIRMED,
        date: Between(windowStart, windowEnd),
      },
    });

    if (conflict) {
      throw new BadRequestException(
        'Agent already has a confirmed appointment in this time window',
      );
    }
  }
}
