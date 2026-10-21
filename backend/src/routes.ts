import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes';
import { catalogRoutes } from './modules/locations/catalog.routes';
import { searchRoutes } from './modules/search/search.routes';
import { requestsRoutes, shortlistRoutes } from './modules/requests/requests.routes';
import { tutorsRoutes } from './modules/tutors/tutors.routes';
import { usersRoutes } from './modules/users/users.routes';
import { verificationRoutes } from './modules/verification/verification.routes';

// Every module mounts here; the whole API lives under /api/v1.
export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', usersRoutes);
apiRoutes.use('/tutors', searchRoutes);
apiRoutes.use('/tutors', tutorsRoutes);
apiRoutes.use('/catalog', catalogRoutes);
apiRoutes.use('/requests', requestsRoutes);
apiRoutes.use('/shortlist', shortlistRoutes);
apiRoutes.use('/verification', verificationRoutes);
