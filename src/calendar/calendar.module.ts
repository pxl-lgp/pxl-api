import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { CalendarService } from './calendar.service';
import { ContentCalendarListener } from './content-calendar.listener';

@Module({
  imports: [AutomationModule],
  providers: [CalendarService, ContentCalendarListener],
  exports: [CalendarService],
})
export class CalendarModule {}
