module.exports = {
  apps: [
    {
      name: 'payment-processor',
      script:
        'yarn install && yarn build &&  yarn  migration:run && yarn copy-seed-data && yarn seed:direct && yarn start', // Path to your compiled main file
      instances: 'max', // Or a number like 2
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
