import { DataSource } from 'typeorm';

import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { PaymentMethod } from 'src/payment/entities';
import { EPaymentMethodType } from './common/enums';
import { Merchant } from './auth/entities';

// Load environment variables from .env file
dotenv.config();

async function bootstrap() {
  console.log('Starting direct seed process...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'payment_processor',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true, // Enable synchronize to create tables
  });

  try {
    await dataSource.initialize();
    console.log('Connected to the database');

    // Read seed data - try multiple paths
    let fileContent;
    let seedFilePath;

    // Try different paths to find the seed file
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'seeds', 'seed-data.json'),
      path.join(process.cwd(), 'dist', 'src', 'seeds', 'seed-data.json'),
      path.join(__dirname, 'seeds', 'seed-data.json'),
      path.join(process.cwd(), 'dist', 'seeds', 'seed-data.json'),
    ];

    for (const path of possiblePaths) {
      try {
        if (fs.existsSync(path)) {
          seedFilePath = path;
          fileContent = fs.readFileSync(path, 'utf8');
          console.log(`Seed data found at: ${path}`);
          break;
        }
      } catch (err) {
        console.log(`Could not read from path: ${path}`);
      }
    }

    if (!fileContent) {
      throw new Error(
        `Could not find seed-data.json in any of these locations: ${possiblePaths.join(', ')}`,
      );
    }

    const seedData = JSON.parse(fileContent);

    // Seed merchants
    console.log('Seeding merchants...');

    const merchantRepository = dataSource.getRepository(Merchant);
    const paymentMethodRepository = dataSource.getRepository(PaymentMethod);

    for (const merchantData of seedData.merchants) {
      // Check if merchant already exists
      const existingMerchant = await merchantRepository.findOne({
        where: { email: merchantData.email },
      });

      if (!existingMerchant) {
        // Hash password manually since @BeforeInsert won't work here
        const hashedPassword = await bcrypt.hash(merchantData.password, 10);

        const merchant = merchantRepository.create({
          name: merchantData.name,
          email: merchantData.email,
          password: hashedPassword,
        });

        await merchantRepository.save(merchant);
        console.log(`Created merchant: ${merchant.email}`);
      } else {
        console.log(`Merchant already exists: ${merchantData.email}`);
      }
    }

    // Seed payment methods
    console.log('Seeding payment methods...');

    for (const paymentMethodData of seedData.paymentMethods) {
      // Find the associated merchant
      const merchant = await merchantRepository.findOne({
        where: { email: paymentMethodData.merchantEmail },
      });

      if (!merchant) {
        console.log(
          `Merchant not found for email: ${paymentMethodData.merchantEmail}, skipping payment method`,
        );
        continue;
      }

      // Convert string type to enum
      const paymentMethodType = paymentMethodData.type as EPaymentMethodType;

      // Check if payment method already exists
      const existingPaymentMethod = await paymentMethodRepository.findOne({
        where: {
          merchantId: merchant.id,
          name: paymentMethodData.name,
        },
      });

      if (!existingPaymentMethod) {
        const paymentMethod = paymentMethodRepository.create({
          name: paymentMethodData.name,
          type: paymentMethodType,
          active: paymentMethodData.active,
          configuration: paymentMethodData.configuration,
          merchantId: merchant.id,
        });

        await paymentMethodRepository.save(paymentMethod);
        console.log(
          `Created payment method: ${paymentMethodData.name} for merchant: ${merchant.email}`,
        );
      } else {
        console.log(
          `Payment method already exists: ${paymentMethodData.name} for merchant: ${merchant.email}`,
        );
      }
    }

    console.log('Seeding completed successfully');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

bootstrap();
