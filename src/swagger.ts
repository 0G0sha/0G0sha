import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import type { Express } from 'express'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))
const appVersion = packageJson.version

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'APIs Docs',
      version: appVersion,
      description: "API documentation for 0Gosha, <a href='https://api.0Gosha.com/documentation'>Project documentation</a>",
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Live URL',
      },
    ],
  },
  apis: [
    './src/Module/**/*.swagger.ts',
  ],
}

const swaggerSpec = swaggerJsdoc(options)

const swaggerUiOptions = {
  customCss: `
    :root {
      --primary-color: #3b82f6;
      --secondary-color: #60a5fa;
      --text-color: #e5e7eb;
      --text-secondary: #9ca3af;
      --bg-color: #0f172a;
      --card-bg: #1e293b;
      --border-color: #334155;
      --hover-bg: #334155;
      --code-bg: #0f172a;
      --code-color: #f472b6;
    }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg-color);
    }
    .swagger-ui { 
      background: var(--bg-color); 
      color: var(--text-color);
    }
    .swagger-ui .topbar { 
      display: none; 
    }
    .swagger-ui .info .title {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .swagger-ui .info .title::before {
      content: "";
      display: inline-block;
      width: 150px;
      height: 150px;
      background-image: url('/v0/public/egy-stay-logo.png');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }
    .swagger-ui .info .title,
    .swagger-ui .info .title small,
    .swagger-ui .info p,
    .swagger-ui .info a,
    .swagger-ui .info li,
    .swagger-ui .opblock-tag,
    .swagger-ui .opblock .opblock-summary-description,
    .swagger-ui .opblock .opblock-summary-operation-id,
    .swagger-ui .opblock .opblock-summary-path,
    .swagger-ui .opblock .opblock-summary-path__deprecated,
    .swagger-ui .parameter__name,
    .swagger-ui .parameter__type,
    .swagger-ui .parameter__deprecated,
    .swagger-ui .parameter__in,
    .swagger-ui .response-col_status,
    .swagger-ui .response-col_description,
    .swagger-ui .model,
    .swagger-ui .model-title,
    .swagger-ui .prop-type,
    .swagger-ui .prop-format,
    .swagger-ui label,
    .swagger-ui select,
    .swagger-ui .btn,
    .swagger-ui p,
    .swagger-ui span,
    .swagger-ui td,
    .swagger-ui h4,
    .swagger-ui h5 {
      color: var(--text-color) !important;
    }
    
    /* Parameters and Headers section */
    .swagger-ui .opblock-section-header,
    .swagger-ui .opblock .opblock-section-header {
      background-color: var(--bg-color) !important;
      box-shadow: none;
    }
    .swagger-ui .opblock-section-header h4,
    .swagger-ui .opblock .opblock-section-header h4 {
      color: var(--text-color) !important;
    }
    .swagger-ui .opblock-description-wrapper,
    .swagger-ui .opblock-body {
      background: var(--card-bg);
    }
    .swagger-ui .tab {
      background: var(--card-bg);
    }
    .swagger-ui .tab li {
      color: var(--text-color);
    }
    .swagger-ui .tab li.active {
      background: var(--bg-color);
    }
    
    /* Execute and Clear buttons */
    .swagger-ui .btn.execute {
      background-color: var(--primary-color);
      border-color: var(--primary-color);
      color: #fff;
    }
    .swagger-ui .btn.execute:hover {
      background-color: var(--secondary-color);
      border-color: var(--secondary-color);
    }
    .swagger-ui .btn-clear {
      background: var(--card-bg);
      border-color: var(--border-color);
      color: var(--text-color);
    }
    .swagger-ui .btn-clear:hover {
      background: var(--hover-bg);
    }
    
    /* Responses section */
    .swagger-ui .responses-wrapper {
      background: var(--card-bg) !important;
    }
    .swagger-ui .responses-inner h4,
    .swagger-ui .responses-inner h5 {
      color: var(--text-color) !important;
    }
    .swagger-ui .response .response-col_status {
      color: var(--text-color);
    }
    .swagger-ui .response .response-col_description {
      color: var(--text-color);
    }
    
    /* Curl section */
    .swagger-ui .curl-command {
      background: var(--code-bg);
      border: 1px solid var(--border-color);
      color: var(--text-color);
    }
    .swagger-ui .curl-command pre {
      color: var(--text-color);
    }
    .swagger-ui .copy-to-clipboard {
      background: var(--card-bg);
      border-color: var(--border-color);
    }
    .swagger-ui .copy-to-clipboard button {
      color: var(--text-color);
    }
    
    .swagger-ui .scheme-container { 
      background: var(--card-bg); 
      box-shadow: none;
    }
    .swagger-ui .opblock { 
      background: var(--card-bg);
      border-color: var(--border-color);
    }
    .swagger-ui .opblock .opblock-summary { 
      background: var(--card-bg); 
      border-color: var(--border-color);
    }
    .swagger-ui .opblock.opblock-get { 
      background: var(--card-bg);
      border-color: #61affe;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary { 
      background: rgba(97, 175, 254, 0.1);
    }
    .swagger-ui .opblock.opblock-post { 
      background: var(--card-bg);
      border-color: #49cc90;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary { 
      background: rgba(73, 204, 144, 0.1);
    }
    .swagger-ui .opblock.opblock-put { 
      background: var(--card-bg);
      border-color: #fca130;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary { 
      background: rgba(252, 161, 48, 0.1);
    }
    .swagger-ui .opblock.opblock-delete { 
      background: var(--card-bg);
      border-color: #f93e3e;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary { 
      background: rgba(249, 62, 62, 0.1);
    }
    .swagger-ui .opblock.opblock-patch { 
      background: var(--card-bg);
      border-color: #50e3c2;
    }
    .swagger-ui .opblock.opblock-patch .opblock-summary { 
      background: rgba(80, 227, 194, 0.1);
    }
    .swagger-ui .opblock-tag { 
      border-bottom-color: var(--border-color);
    }
    .swagger-ui table thead tr th,
    .swagger-ui table thead tr td {
      border-color: var(--border-color);
      background: var(--card-bg) !important;
      color: var(--text-color) !important;
    }
    .swagger-ui .table tbody tr td {
      border-color: var(--border-color);
    }
    .swagger-ui input,
    .swagger-ui textarea,
    .swagger-ui select {
      background: var(--card-bg);
      border-color: var(--border-color);
      color: var(--text-color);
    }
    .swagger-ui .response-col_status {
      color: var(--text-color);
    }
    .swagger-ui .model-box,
    .swagger-ui .model {
      background: var(--card-bg);
    }
    .swagger-ui section.models {
      border-color: var(--border-color);
    }
    .swagger-ui .model-container {
      background: var(--card-bg);
    }
    .swagger-ui .btn {
      background: var(--card-bg);
      border-color: var(--border-color);
    }
    .swagger-ui .btn:hover {
      background: var(--hover-bg);
    }
  `,
  customSiteTitle: '0Gosha API Docs',
  customfavIcon: '/v0/public/favicon.ico',
}

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions))
  console.log('📄 Swagger docs endpoints available at:', process.env.NODE_ENV === 'development' ? `${String(process.env.SITE_API_Local_URL)}/api-docs` : `${String(process.env.SITE_API_URL)}/api-docs`)
}
