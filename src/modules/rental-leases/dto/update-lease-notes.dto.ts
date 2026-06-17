import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLeaseNotesDto {
  @ApiPropertyOptional({ example: 'Locataire sérieux, paiements à jour.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ example: 'Appartement rendu en bon état.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  exitNotes?: string;

  @ApiPropertyOptional({ example: "État des lieux d'entrée conforme." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  entryNotes?: string;
}
