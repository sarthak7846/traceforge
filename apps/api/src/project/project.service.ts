import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CreateProjectDto, CreateTraceDto } from './project.dto';
import { OrganizationService } from 'src/organization/organization.service';
import { MembershipService } from 'src/membership/membership.service';
import { createHash, randomBytes } from 'crypto';
import { APIKeyPayload } from './types/api-key.interface';
import { KafkaService } from 'src/kafka/kafka.service';
import { prisma } from '@observe/db';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(forwardRef(() => OrganizationService))
    private readonly organizationService: OrganizationService,
    private readonly membershipService: MembershipService,
    private readonly kafkaService: KafkaService,
  ) {}

  async createProject(dto: CreateProjectDto, userId: string) {
    await this.organizationService.getOrganizationById(
      dto.organizationId,
      userId,
    );

    return prisma.project.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async getAllProjects(organizationId?: string) {
    const projects = await prisma.project.findMany({
      where: {
        organizationId,
      },
    });

    return projects;
  }

  async createAPIKey(projectId: string, userId: string, name: string) {
    const project = await prisma.project.findUniqueOrThrow({
      where: {
        id: projectId,
      },
    });

    await this.membershipService.getMembershipById(
      userId,
      project.organizationId,
    );

    // Create a unique key with hash
    const randomPart = randomBytes(32).toString('hex');
    const rawKey = `obs_live_${randomPart}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const { id } = await prisma.aPIKey.create({
      data: {
        projectId,
        name,
        keyHash,
      },
    });

    return {
      id,
      key: rawKey,
      name,
    };
  }

  async getAllAPIKeys(projectId: string, userId: string) {
    const project = await prisma.project.findUniqueOrThrow({
      where: {
        id: projectId,
      },
    });

    await this.membershipService.getMembershipById(
      userId,
      project.organizationId,
    );

    const apiKeys = await prisma.aPIKey.findMany({
      where: {
        projectId,
      },
    });

    return apiKeys;
  }

  async verifyAPIKey(apiKey: string) {
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const apiKeyEntry = await prisma.aPIKey.findFirst({
      where: {
        keyHash,
      },
    });

    if (!apiKeyEntry || apiKeyEntry.revokedAt) return false;

    return {
      id: apiKeyEntry.id,
      projectId: apiKeyEntry.projectId,
    };
  }

  async createTrace(
    createTraceDto: CreateTraceDto,
    apiKeyPayload: APIKeyPayload,
  ) {
    const { projectId, id } = apiKeyPayload;

    await this.kafkaService.publishTrace({
      ...createTraceDto,
      projectId,
      apiKeyId: id,
      input: createTraceDto.input,
      output: createTraceDto.output,
      metadata: createTraceDto.metadata,
      ingestionStartedAt: Date.now()
    });

    return { accepted: true };
  }
}
