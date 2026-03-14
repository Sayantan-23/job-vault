export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8080'],
  },
  nodeEnv: process.env.NODE_ENV || 'development',
});
