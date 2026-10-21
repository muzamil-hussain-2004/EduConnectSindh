import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import {
  idParamSchema,
  listRequestsQuerySchema,
  rejectSchema,
  uploadDocumentSchema,
} from './verification.schema';
import { verificationService } from './verification.service';

const actor = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
};

export const verificationController = {
  async myStatus(req: Request, res: Response) {
    res.json({ success: true, data: await verificationService.myStatus(actor(req).id) });
  },

  async upload(req: Request, res: Response) {
    const { type } = uploadDocumentSchema.parse(req.body);
    const document = await verificationService.uploadDocument(actor(req).id, type, req.file);
    res.status(201).json({ success: true, data: { document } });
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await verificationService.deleteDocument(actor(req).id, id);
    res.json({ success: true, data: null });
  },

  async submit(req: Request, res: Response) {
    res.json({ success: true, data: await verificationService.submit(actor(req).id) });
  },

  async file(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const file = await verificationService.getDocumentFile(actor(req), id);
    // "attachment" makes browsers download instead of rendering, which is safer for user uploads.
    res.attachment(file.originalName);
    res.type(file.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    // The upload folder is ".private", and sendFile refuses dot-folders unless told otherwise.
    res.sendFile(file.path, { dotfiles: 'allow' });
  },

  async listRequests(req: Request, res: Response) {
    const { items, meta } = await verificationService.listRequests(
      listRequestsQuerySchema.parse(req.query),
    );
    res.json({ success: true, data: items, meta });
  },

  async getRequest(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.json({ success: true, data: await verificationService.getRequest(id) });
  },

  async approve(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.json({ success: true, data: await verificationService.approve(id) });
  },

  async reject(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { reason } = rejectSchema.parse(req.body);
    res.json({ success: true, data: await verificationService.reject(id, reason) });
  },
};
