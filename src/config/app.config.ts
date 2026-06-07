export const appConfig = {
  port: parseInt(process.env.PORT || '4000', 10),
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    expiresIn: '1h',
  },
};
