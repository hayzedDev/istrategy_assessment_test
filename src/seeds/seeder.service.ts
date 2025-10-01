import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { EPaymentMethodType } from '../common/enums';
import { PaymentMethod } from 'src/payment/entities';
import { Merchant } from '../auth/entities';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  private seedData: {
    merchants: {
      name: string;
      email: string;
      password: string;
    }[];
    paymentMethods: {
      merchantEmail: string;
      name: string;
      type: string;
      active: boolean;
      configuration: Record<string, any>;
    }[];
  };

  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
  ) {
    try {
      // First, try to read from dist directory (production)
      const seedFilePath = path.join(
        process.cwd(),
        'dist',
        'src',
        'seeds',
        'seed-data.json',
      );
      this.logger.log(`Trying to read seed data from: ${seedFilePath}`);

      if (fs.existsSync(seedFilePath)) {
        const fileContent = fs.readFileSync(seedFilePath, 'utf8');
        this.seedData = JSON.parse(fileContent);
        this.logger.log('Seed data loaded from dist directory');
      } else {
        // Fall back to src directory (development)
        const devSeedFilePath = path.join(
          process.cwd(),
          'src',
          'seeds',
          'seed-data.json',
        );
        this.logger.log(
          `Falling back to read seed data from: ${devSeedFilePath}`,
        );

        if (fs.existsSync(devSeedFilePath)) {
          const fileContent = fs.readFileSync(devSeedFilePath, 'utf8');
          this.seedData = JSON.parse(fileContent);
          this.logger.log('Seed data loaded from src directory');
        } else {
          throw new Error(
            'Could not find seed-data.json in either dist or src directory',
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to read seed data: ${error.message}`);
      throw error;
    }
  }

  async seed() {
    this.logger.log('Starting seed data process...');
    await this.seedMerchants();
    await this.seedPaymentMethods();
    this.logger.log('Seed data process completed!');
  }

  async seedMerchants() {
    try {
      this.logger.log('Seeding merchants...');

      for (const merchantData of this.seedData.merchants) {
        // Check if merchant already exists
        const existingMerchant = await this.merchantRepository.findOne({
          where: { email: merchantData.email },
        });

        if (!existingMerchant) {
          // Ensure password exists before hashing
          if (!merchantData.password) {
            this.logger.error(
              `Missing password for merchant: ${merchantData.email}`,
            );
            continue; // Skip this merchant
          }

          const hashedPassword = await bcrypt.hash(merchantData.password, 10);

          const merchant = this.merchantRepository.create({
            name: merchantData.name,
            email: merchantData.email,
            password: hashedPassword,
          });

          await this.merchantRepository.save(merchant);
          this.logger.log(`Created merchant: ${merchant.email}`);
        } else {
          this.logger.log(`Merchant already exists: ${merchantData.email}`);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  async seedPaymentMethods() {
    this.logger.log('Seeding payment methods...');

    for (const paymentMethodData of this.seedData.paymentMethods) {
      // Find the associated merchant
      const merchant = await this.merchantRepository.findOne({
        where: { email: paymentMethodData.merchantEmail },
      });

      if (!merchant) {
        this.logger.warn(
          `Merchant not found for email: ${paymentMethodData.merchantEmail}, skipping payment method`,
        );
        continue;
      }

      // Convert string type to enum
      const paymentMethodType = paymentMethodData.type as EPaymentMethodType;

      // Check if payment method already exists
      const existingPaymentMethod = await this.paymentMethodRepository.findOne({
        where: {
          merchantId: merchant.id,
          name: paymentMethodData.name,
        },
      });

      if (!existingPaymentMethod) {
        const paymentMethod = this.paymentMethodRepository.create({
          name: paymentMethodData.name,
          type: paymentMethodType,
          active: paymentMethodData.active,
          configuration: paymentMethodData.configuration,
          merchantId: merchant.id,
        });

        await this.paymentMethodRepository.save(paymentMethod);
        this.logger.log(
          `Created payment method: ${paymentMethodData.name} for merchant: ${merchant.email}`,
        );
      } else {
        this.logger.log(
          `Payment method already exists: ${paymentMethodData.name} for merchant: ${merchant.email}`,
        );
      }
    }
  }
}
