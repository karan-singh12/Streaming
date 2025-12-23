import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../config/swagger.config';

const router = Router();

// Swagger UI setup
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MSC LIVE API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
  },
};

// Swagger UI routes - swaggerUi.serve needs to be called for each route
const swaggerUiHandler = swaggerUi.setup(swaggerSpec, swaggerUiOptions);

router.use('/docs', swaggerUi.serve, swaggerUiHandler);
router.get('/docs', swaggerUi.serve, swaggerUiHandler);

// Swagger JSON endpoint
router.get('/swagger.json', (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  } catch (error) {
    console.error('Error serving Swagger JSON:', error);
    res.status(500).json({ error: 'Failed to generate Swagger documentation' });
  }
});

export default router;

