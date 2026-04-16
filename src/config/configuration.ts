export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  whatsapp: {
    authDir: process.env.WA_AUTH_DIR || './auth_info',
    printQr: process.env.WA_PRINT_QR !== 'false',
    delayBetweenMessages: parseInt(process.env.WA_DELAY_BETWEEN_MESSAGES, 10) || 1500,
    maxRetries: parseInt(process.env.WA_MAX_RETRIES, 10) || 3,
  },
});
