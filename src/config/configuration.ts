export default () => ({
  port: Number.parseInt(process.env.PORT ?? '3000', 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  whatsapp: {
    authDir: process.env.WA_AUTH_DIR || './auth_info',
    printQr: process.env.WA_PRINT_QR !== 'false',
    delayBetweenMessages: Number.parseInt(process.env.WA_DELAY_BETWEEN_MESSAGES ?? '1500', 10) || 1500,
    maxRetries: Number.parseInt(process.env.WA_MAX_RETRIES ?? '3', 10) || 3,
  },
});
