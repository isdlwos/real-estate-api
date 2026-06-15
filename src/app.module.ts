import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HealthModule } from './health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { PropertyImagesModule } from './modules/property-images/property-images.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { PropertyToursModule } from './modules/property-tours/property-tours.module';
import { DiasporaTransactionsModule } from './modules/diaspora-transactions/diaspora-transactions.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { RentalLeasesModule } from './modules/rental-leases/rental-leases.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig, jwtConfig],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        cfg.get<TypeOrmModuleOptions>('database') as TypeOrmModuleOptions,
    }),
    HealthModule,
    MailModule,
    AdminModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    PropertyImagesModule,
    AppointmentsModule,
    FavoritesModule,
    PropertyToursModule,
    DiasporaTransactionsModule,
    SubscriptionsModule,
    RentalLeasesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
