import { IsIn } from 'class-validator';

export class CreateCheckoutDto {
  @IsIn(['starter', 'pro', 'agency'])
  planSlug: string;
}
