import { Router } from 'express';
import { searchService } from './search.service';
import { searchTutorsQuerySchema } from './search.schema';

// Mounted at /tutors in routes.ts, before the tutors router, so GET /tutors is the search.
export const searchRoutes = Router();

searchRoutes.get('/', async (req, res) => {
  const { items, meta } = await searchService.searchTutors(
    searchTutorsQuerySchema.parse(req.query),
  );
  res.json({ success: true, data: items, meta });
});
