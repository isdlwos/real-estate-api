import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response } from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  const corsOrigins = process.env.CORS_ORIGINS;
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',') : '*',
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
    .setTitle('Real Estate API')
    .setDescription('API REST pour une agence immobilière — NestJS + PostgreSQL')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const app2 = app.getHttpAdapter().getInstance();
  app2.get('/api/redoc', (_req: Request, res: Response) => {
    res.send(`<!DOCTYPE html>
<html lang="fr">
  <head>
    <title>Real Estate API — Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }

      /* Scrollbar sidebar */
      .menu-content::-webkit-scrollbar { width: 4px; }
      .menu-content::-webkit-scrollbar-track { background: transparent; }
      .menu-content::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }

      /* Badges méthodes HTTP */
      [class*="http-verb"] { letter-spacing: 0.04em; font-weight: 600 !important; border-radius: 5px !important; }
    </style>
  </head>
  <body>
    <div id="redoc-container"></div>
    <script src="https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js"></script>
    <script>
      Redoc.init('/api/docs-json', {
        hideDownloadButton: false,
        expandResponses: '200,201',
        expandSingleSchemaField: true,
        hideHostname: false,
        noAutoAuth: false,
        pathInMiddlePanel: false,
        scrollYOffset: 0,
        sortPropsAlphabetically: false,
        requiredPropsFirst: true,
        theme: {
          spacing: { unit: 5, sectionHorizontal: 40, iconSize: 20 },
          colors: {
            primary:  { main: '#6366F1' },
            success:  { main: '#10B981' },
            warning:  { main: '#F59E0B' },
            error:    { main: '#EF4444' },
            text:     { primary: '#1E293B', secondary: '#64748B' },
            border:   { dark: '#CBD5E1', light: '#E2E8F0' },
            responses: {
              success:  { color: '#10B981', backgroundColor: '#F0FDF4' },
              redirect: { color: '#F59E0B', backgroundColor: '#FFFBEB' },
              info:     { color: '#6366F1', backgroundColor: '#EEF2FF' },
              error:    { color: '#EF4444', backgroundColor: '#FEF2F2' },
            },
            http: {
              get:     '#10B981',
              post:    '#6366F1',
              put:     '#F59E0B',
              patch:   '#8B5CF6',
              delete:  '#EF4444',
              options: '#64748B',
              head:    '#64748B',
              basic:   '#64748B',
              link:    '#0EA5E9',
            },
          },
          typography: {
            fontSize: '15px',
            lineHeight: '1.65em',
            fontWeightRegular: '400',
            fontWeightBold: '600',
            fontWeightLight: '300',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            smoothing: 'antialiased',
            optimizeSpeed: true,
            headings: {
              fontFamily: '"Inter", sans-serif',
              fontWeight: '700',
              lineHeight: '1.3em',
            },
            code: {
              fontSize: '13px',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              lineHeight: '1.6em',
              fontWeight: '400',
              color: '#E2E8F0',
              backgroundColor: '#0F172A',
              wrap: true,
            },
            links: { color: '#6366F1' },
          },
          sidebar: {
            width: '300px',
            backgroundColor: '#0F172A',
            textColor: '#94A3B8',
          },
          logo: { gutter: '24px' },
          rightPanel: {
            backgroundColor: '#1E293B',
            width: '38%',
          },
          fab: {
            backgroundColor: '#6366F1',
            color: '#FFFFFF',
          },
          schema: {
            linesColor: '#CBD5E1',
            typeNameColor: '#6366F1',
            typeTitleColor: '#6366F1',
            requireLabelColor: '#EF4444',
            labelsTextSize: '0.85em',
            nestingSpacing: '1em',
          },
        },
      }, document.getElementById('redoc-container'));
    </script>
  </body>
</html>`);
  });
  } // end if (NODE_ENV !== 'production')

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application running on http://localhost:${port}/api/v1`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger UI  →  http://localhost:${port}/api/docs`);
    console.log(`ReDoc       →  http://localhost:${port}/api/redoc`);
  }
}
bootstrap();
