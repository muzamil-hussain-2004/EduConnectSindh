import { Router } from 'express';
import { searchService } from './search.service';
import { recommendQuerySchema, searchTutorsQuerySchema } from './search.schema';
import { recommendService } from './search.recommend';

// Mounted at /tutors in routes.ts, before the tutors router, so GET /tutors is the search.
export const searchRoutes = Router();

searchRoutes.get('/', async (req, res) => {
  const { items, meta } = await searchService.searchTutors(
    searchTutorsQuerySchema.parse(req.query),
  );
  res.json({ success: true, data: items, meta });
});

// Registered before tutorsRoutes' /:id, so "recommended" is never read as an id.
searchRoutes.get('/recommended', async (req, res) => {
  const data = await recommendService.recommend(recommendQuerySchema.parse(req.query));
  res.json({ success: true, data });
});
