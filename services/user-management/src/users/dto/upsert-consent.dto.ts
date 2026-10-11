import { IsBoolean, IsString, MaxLength } from 'class-validator';

export class UpsertConsentDto {
  @IsBoolean()
  granted!: boolean;

  @IsString()
  @MaxLength(40)
  policyVersion!: string;
}
