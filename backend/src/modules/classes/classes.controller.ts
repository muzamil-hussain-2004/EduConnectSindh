import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { idParamSchema, listClassesQuerySchema } from './classes.schema';
import { classesService } from './classes.service';

const user = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
};
const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

export const classesController = {
  async create(req: Request, res: Response) {
    ok(res, { session: await classesService.create(user(req).id, req.body) }, 201);
  },
  async mine(req: Request, res: Response) {
    ok(res, await classesService.listMine(user(req).id));
  },
  async booked(req: Request, res: Response) {
    ok(res, await classesService.listBooked(user(req).id));
  },
  async list(req: Request, res: Response) {
    const { items, meta } = await classesService.listUpcoming(
      listClassesQuerySchema.parse(req.query),
    );
    res.json({ success: true, data: items, meta });
  },
  async get(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, { session: await classesService.get(id) });
  },
  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, { session: await classesService.update(user(req).id, id, req.body) });
  },
  async cancel(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, { session: await classesService.cancel(user(req).id, id) });
  },
  async book(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, { session: await classesService.book(user(req).id, id) }, 201);
  },
  async unbook(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await classesService.unbook(user(req).id, id);
    ok(res, null);
  },
  async join(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await classesService.getJoinLink(user(req), id));
  },
};
