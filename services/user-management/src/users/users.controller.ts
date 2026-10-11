import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { UserConsent, UserPreference, UserProfile } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { CurrentUser } from './current-user.decorator';
import { UpsertConsentDto } from './dto/upsert-consent.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload): Promise<UserProfile> {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() payload: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(user.sub, payload);
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: JwtPayload): Promise<UserPreference> {
    return this.usersService.getPreferences(user.sub);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() payload: UpdatePreferencesDto,
  ): Promise<UserPreference> {
    return this.usersService.updatePreferences(user.sub, payload);
  }

  @Get('consents')
  async getConsents(@CurrentUser() user: JwtPayload): Promise<UserConsent[]> {
    return this.usersService.getConsents(user.sub);
  }

  @Put('consents/:category')
  async upsertConsent(
    @CurrentUser() user: JwtPayload,
    @Param('category') category: string,
    @Body() payload: UpsertConsentDto,
  ): Promise<UserConsent> {
    return this.usersService.upsertConsent(user.sub, category, payload);
  }
}
