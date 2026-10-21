import { Router } from 'express';
import { catalogRepository } from './catalog.repository';

// Public reference data used by dropdowns in the frontend.
export const catalogRoutes = Router();

catalogRoutes.get('/cities', async (_req, res) => {
  res.json({ success: true, data: await catalogRepository.cities() });
});

catalogRoutes.get('/subjects', async (_req, res) => {
  res.json({ success: true, data: await catalogRepository.subjects() });
});
