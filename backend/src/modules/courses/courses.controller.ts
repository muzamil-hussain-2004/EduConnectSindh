import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import {
  idParamSchema,
  lessonParamsSchema,
  listCoursesQuerySchema,
  materialParamsSchema,
  pageQuerySchema,
} from './courses.schema';
import { coursesService } from './courses.service';

const user = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
};

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

export const coursesController = {
  // ----- tutor -----
  async create(req: Request, res: Response) {
    ok(res, { course: await coursesService.create(user(req).id, req.body) }, 201);
  },
  async mine(req: Request, res: Response) {
    ok(res, await coursesService.listMine(user(req).id));
  },
  async manage(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, { course: await coursesService.manage(user(req).id, id) });
  },
  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, { course: await coursesService.update(user(req).id, id, req.body) });
  },
  async publish(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, { course: await coursesService.publish(user(req).id, id) });
  },
  async unpublish(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, { course: await coursesService.unpublish(user(req).id, id) });
  },
  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await coursesService.remove(user(req).id, id);
    ok(res, null);
  },
  async addLesson(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, { lesson: await coursesService.addLesson(user(req).id, id, req.body) }, 201);
  },
  async updateLesson(req: Request, res: Response) {
    const { id, lessonId } = lessonParamsSchema.parse(req.params);
    ok(res, {
      lesson: await coursesService.updateLesson(user(req).id, id, lessonId, req.body),
    });
  },
  async addMaterial(req: Request, res: Response) {
    const { id, lessonId } = lessonParamsSchema.parse(req.params);
    const material = await coursesService.addMaterial(user(req).id, id, lessonId, req.file);
    ok(res, { material }, 201);
  },
  async deleteMaterial(req: Request, res: Response) {
    const { id, lessonId, materialId } = materialParamsSchema.parse(req.params);
    await coursesService.deleteMaterial(user(req).id, id, lessonId, materialId);
    ok(res, null);
  },
  async materialFile(req: Request, res: Response) {
    const { id, lessonId, materialId } = materialParamsSchema.parse(req.params);
    const file = await coursesService.getMaterialFile(user(req), id, lessonId, materialId);
    res.type(file.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(file.path, { dotfiles: 'allow' });
  },

  async deleteLesson(req: Request, res: Response) {
    const { id, lessonId } = lessonParamsSchema.parse(req.params);
    await coursesService.deleteLesson(user(req).id, id, lessonId);
    ok(res, null);
  },

  // ----- public -----
  async list(req: Request, res: Response) {
    const { items, meta } = await coursesService.list(listCoursesQuerySchema.parse(req.query));
    res.json({ success: true, data: items, meta });
  },
  async get(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, { course: await coursesService.getPublic(id) });
  },

  // ----- students -----
  async enroll(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await coursesService.enroll(user(req).id, id), 201);
  },
  async unenroll(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await coursesService.unenroll(user(req).id, id);
    ok(res, null);
  },
  async enrollment(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    ok(res, await coursesService.enrollmentState(user(req).id, id));
  },
  async myEnrollments(req: Request, res: Response) {
    const { items, meta } = await coursesService.myEnrollments(
      user(req).id,
      pageQuerySchema.parse(req.query),
    );
    res.json({ success: true, data: items, meta });
  },
  async getLesson(req: Request, res: Response) {
    const { id, lessonId } = lessonParamsSchema.parse(req.params);
    ok(res, { lesson: await coursesService.getLesson(user(req), id, lessonId) });
  },
  async complete(req: Request, res: Response) {
    const { id, lessonId } = lessonParamsSchema.parse(req.params);
    ok(res, await coursesService.setLessonDone(user(req).id, id, lessonId, true));
  },
  async uncomplete(req: Request, res: Response) {
    const { id, lessonId } = lessonParamsSchema.parse(req.params);
    ok(res, await coursesService.setLessonDone(user(req).id, id, lessonId, false));
  },
};
