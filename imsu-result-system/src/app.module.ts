import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FacultiesModule } from './faculties/faculties.module';
import { DepartmentsModule } from './departments/departments.module';
import { CoursesModule } from './courses/courses.module';
import { AcademicSessionsModule } from './academic-sessions/academic-sessions.module';
import { ResultSheetsModule } from './result-sheets/result-sheets.module';
import { JwtConfigModule } from './auth/jwt.module';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email/email.service';
import { EmailController } from './email/email.controller';
import { EmailModule } from './email/email.module';
import { UsersModule } from './users/users.module';
import { AdminsService } from './admin/admin.service';
import { AdminsController } from './admin/admin.controller';
import { EmailVerificationCleanupService } from './auth/email-verification-cleanup.service';
import { AdminsModule } from './admin/admin.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FacultiesModule,
    DepartmentsModule,
    CoursesModule,
    AcademicSessionsModule,
    ResultSheetsModule,
    JwtConfigModule,
    EmailModule,
    UsersModule,
    AdminsModule,
  ],
  controllers: [AppController, EmailController, AdminsController],
  providers: [
    AppService,
    EmailService,
    AdminsService,
    EmailVerificationCleanupService,
  ],
})
export class AppModule {}
