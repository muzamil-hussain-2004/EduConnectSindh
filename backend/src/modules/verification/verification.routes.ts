import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { uploadSingleFile } from '../../middlewares/upload.middleware';
import { verificationController } from './verification.controller';

export const verificationRoutes = Router();

verificationRoutes.use(authenticate);

// Tutor side
verificationRoutes.get('/me', authorize('TUTOR'), verificationController.myStatus);
verificationRoutes.post(
  '/documents',
  authorize('TUTOR'),
  uploadSingleFile,
  verificationController.upload,
);
verificationRoutes.delete('/documents/:id', authorize('TUTOR'), verificationController.remove);
verificationRoutes.post('/submit', authorize('TUTOR'), verificationController.submit);

// Owner or admin (checked in the service)
verificationRoutes.get('/documents/:id/file', verificationController.file);

// Admin side
verificationRoutes.get('/requests', authorize('ADMIN'), verificationController.listRequests);
verificationRoutes.get('/requests/:id', authorize('ADMIN'), verificationController.getRequest);
verificationRoutes.post(
  '/requests/:id/approve',
  authorize('ADMIN'),
  verificationController.approve,
);
verificationRoutes.post('/requests/:id/reject', authorize('ADMIN'), verificationController.reject);
