import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client = new PrismaClient();

  get user() {
    return this.client.user;
  }

  get refreshToken() {
    return this.client.refreshToken;
  }

  get workspace() {
    return this.client.workspace;
  }

  get workspaceMember() {
    return this.client.workspaceMember;
  }

  get noteRecord() {
    return this.client.noteRecord;
  }

  get templateRecord() {
    return this.client.templateRecord;
  }

  get tagRecord() {
    return (this.client as PrismaClient & { tagRecord?: unknown }).tagRecord as any;
  }

  $transaction = this.client.$transaction.bind(this.client);

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
