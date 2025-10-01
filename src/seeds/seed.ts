#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { SeederService } from './seeder.service';
import { Logger } from '@nestjs/common';
import { SeedsModule } from './seeds.module';

async function bootstrap() {
  const logger = new Logger('Seed');

  try {
    logger.log('Starting the seeding process...');

    // Use the SeedingModule that directly imports entities
    const app = await NestFactory.createApplicationContext(SeedsModule);

    const seederService = app.get(SeederService);
    await seederService.seed();

    logger.log('Seeding completed successfully');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
}

bootstrap();
