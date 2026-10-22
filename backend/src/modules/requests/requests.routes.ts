import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { requestsController, shortlistController } from './requests.controller';
import { createRequestSchema } from './requests.schema';

const seeker = authorize('STUDENT', 'PARENT');

export const requestsRoutes = Router();
requestsRoutes.use(authenticate);

requestsRoutes.post('/', seeker, validateBody(createRequestSchema), requestsController.create);
requestsRoutes.get('/mine', seeker, requestsController.listMine);
requestsRoutes.get('/mine/tutor/:id', seeker, requestsController.statusWithTutor);
requestsRoutes.get('/incoming', authorize('TUTOR'), requestsController.listIncoming);
requestsRoutes.post('/:id/accept', authorize('TUTOR'), requestsController.accept);
requestsRoutes.post('/:id/decline', authorize('TUTOR'), requestsController.decline);
requestsRoutes.post('/:id/cancel', seeker, requestsController.cancel);

export const shortlistRoutes = Router();
shortlistRoutes.use(authenticate, seeker);

shortlistRoutes.get('/', shortlistController.list);
shortlistRoutes.put('/:id', shortlistController.add);
shortlistRoutes.delete('/:id', shortlistController.remove);
