#!/bin/bash

# This script sets up and runs the payment processor locally

# Check if PostgreSQL is running
echo "Checking PostgreSQL status..."
if pg_isready; then
  echo "PostgreSQL is running."
else
  echo "PostgreSQL is not running. Please start PostgreSQL and try again."
  exit 1
fi

# Check if database exists, create if not
echo "Checking if payment_processor database exists..."
if psql -lqt | cut -d \| -f 1 | grep -qw payment_processor; then
  echo "Database 'payment_processor' already exists."
else
  echo "Creating database 'payment_processor'..."
  createdb payment_processor
  echo "Database created."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  yarn install
fi

# Build the application
echo "Building the application..."
yarn run build

# Run database migrations
echo "Running database migrations..."
yarn migration:run

# Seed the database
echo "Seeding the database..."
yarn copy-seed-data && yarn seed:direct

# Start the application
echo "Starting the application..."
yarn run start
