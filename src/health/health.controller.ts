import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  @Public()
  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
