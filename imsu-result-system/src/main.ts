import 'dotenv/config';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

const ALLOWED_ENVS = ['development', 'test', 'staging', 'production'] as const;

function getNodeEnv(): (typeof ALLOWED_ENVS)[number] {
  const rawEnv = process.env.NODE_ENV?.trim() || 'development';

  if (!ALLOWED_ENVS.includes(rawEnv as (typeof ALLOWED_ENVS)[number])) {
    throw new Error(
      `NODE_ENV must be one of: ${ALLOWED_ENVS.join(', ')}. Received: ${rawEnv}`,
    );
  }

  return rawEnv as (typeof ALLOWED_ENVS)[number];
}

function getPort(): number {
  const rawPort = process.env.PORT ?? '3000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function getCorsOrigins(isProd: boolean): string[] | false {
  const rawOrigins = process.env.CORS_ORIGINS;

  if (!rawOrigins?.trim()) {
    if (isProd) {
      throw new Error('CORS_ORIGINS must be configured in production.');
    }

    // Browser access is disabled until local origins are configured.
    return false;
  }

  const entries = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error('CORS_ORIGINS contains no valid origins.');
  }

  const normalized = entries.map((entry) => {
    let parsed: URL;

    try {
      parsed = new URL(entry);
    } catch {
      throw new Error(`Invalid CORS origin configured: ${entry}`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`CORS origin must use http or https: ${entry}`);
    }

    if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error(
        `CORS entry must be an origin only (no path, query or hash): ${entry}`,
      );
    }

    if (isProd && parsed.protocol !== 'https:') {
      throw new Error(`Production CORS origins must use HTTPS: ${entry}`);
    }

    // parsed.origin normalizes things like trailing slashes and default ports.
    return parsed.origin;
  });

  return [...new Set(normalized)];
}

function getTrustProxyHops(): number | undefined {
  const rawHops = process.env.TRUST_PROXY_HOPS;

  if (rawHops === undefined || rawHops.trim() === '') {
    return undefined;
  }

  const hops = Number(rawHops);

  if (!Number.isInteger(hops) || hops < 1 || hops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 1 and 10.');
  }

  return hops;
}

async function bootstrap(): Promise<void> {
  const nodeEnv = getNodeEnv();
  const isProd = nodeEnv === 'production';
  const port = getPort();
  const corsOrigins = getCorsOrigins(isProd);
  const proxyHops = getTrustProxyHops();

  // Swagger is on outside production, or when explicitly enabled.
  const swaggerEnabled = !isProd || process.env.ENABLE_SWAGGER === 'true';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  // Only configure trusted proxies when the deployment requires them.
  if (proxyHops !== undefined) {
    app.set('trust proxy', proxyHops);
  }

  app.use(
    helmet({
      // Swagger UI relies on inline scripts/styles, so the CSP is relaxed
      // whenever Swagger is enabled.
      contentSecurityPolicy: isProd && !swaggerEnabled,
    }),
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Nest registers its own SIGTERM/SIGINT handlers and re-sends the signal
  // after cleanup. Do not add extra process.on listeners for these signals.
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('IMSU Student Result System API')
      .setDescription('API documentation for the IMSU Student Result System.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api-docs', app, document);
  }

  const server = await app.listen(port);

  // Keep these above your load balancer's idle timeout (ALB default is 60s)
  // to avoid sporadic 502s from connection reuse races.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  logger.log(`Application running on port ${port} (${nodeEnv})`);

  if (swaggerEnabled) {
    logger.log(`Swagger: http://localhost:${port}/api-docs`);
  }
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error(`Application startup failed: ${message}`, stack);

  process.exit(1);
});
