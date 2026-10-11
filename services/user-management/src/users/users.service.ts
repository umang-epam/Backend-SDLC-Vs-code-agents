import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConsentCategory, UserConsent, UserPreference, UserProfile } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { UpsertConsentDto } from './dto/upsert-consent.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found.');
    }

    return profile;
  }

  updateProfile(userId: string, payload: UpdateProfileDto): Promise<UserProfile> {
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...payload,
      },
      update: payload,
    });
  }

  async getPreferences(userId: string): Promise<UserPreference> {
    const preference = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      return this.prisma.userPreference.create({
        data: { userId },
      });
    }

    return preference;
  }

  updatePreferences(userId: string, payload: UpdatePreferencesDto): Promise<UserPreference> {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...payload,
      },
      update: payload,
    });
  }

  getConsents(userId: string): Promise<UserConsent[]> {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { category: 'asc' },
    });
  }

  upsertConsent(
    userId: string,
    category: string,
    payload: UpsertConsentDto,
  ): Promise<UserConsent> {
    if (!this.isConsentCategory(category)) {
      throw new BadRequestException('Invalid consent category.');
    }

    return this.prisma.userConsent.upsert({
      where: {
        userId_category: {
          userId,
          category,
        },
      },
      create: {
        userId,
        category,
        granted: payload.granted,
        policyVersion: payload.policyVersion,
      },
      update: {
        granted: payload.granted,
        policyVersion: payload.policyVersion,
        grantedAt: new Date(),
      },
    });
  }

  private isConsentCategory(category: string): category is ConsentCategory {
    return Object.values(ConsentCategory).includes(category as ConsentCategory);
  }
}
