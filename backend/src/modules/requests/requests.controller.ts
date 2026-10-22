import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { idParamSchema, listRequestsQuerySchema, respondSchema } from './requests.schema';
import { requestsService } from './requests.service';
import { shortlistService } from './shortlist.service';

const userId = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
};

export const requestsController = {
  async create(req: Request, res: Response) {
    const request = await requestsService.create(userId(req), req.body);
    res.status(201).json({ success: true, data: { request } });
  },

  async statusWithTutor(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.json({ success: true, data: await requestsService.statusWithTutor(userId(req), id) });
  },

  async listMine(req: Request, res: Response) {
    const { items, meta } = await requestsService.listMine(
      userId(req),
      listRequestsQuerySchema.parse(req.query),
    );
    res.json({ success: true, data: items, meta });
  },

  async listIncoming(req: Request, res: Response) {
    const { items, meta } = await requestsService.listIncoming(
      userId(req),
      listRequestsQuerySchema.parse(req.query),
    );
    res.json({ success: true, data: items, meta });
  },

  async accept(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { note } = respondSchema.parse(req.body ?? {});
    const request = await requestsService.respond(userId(req), id, 'ACCEPTED', note);
    res.json({ success: true, data: { request } });
  },

  async decline(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { note } = respondSchema.parse(req.body ?? {});
    const request = await requestsService.respond(userId(req), id, 'DECLINED', note);
    res.json({ success: true, data: { request } });
  },

  async cancel(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.json({ success: true, data: { request: await requestsService.cancel(userId(req), id) } });
  },
};

export const shortlistController = {
  async list(req: Request, res: Response) {
    res.json({ success: true, data: await shortlistService.list(userId(req)) });
  },

  async add(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await shortlistService.add(userId(req), id);
    res.json({ success: true, data: null });
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await shortlistService.remove(userId(req), id);
    res.json({ success: true, data: null });
  },
};
