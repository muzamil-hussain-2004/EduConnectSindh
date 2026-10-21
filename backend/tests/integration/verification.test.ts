import { existsSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { documentStorage } from '../../src/modules/verification/document.storage';
import { hashPassword } from '../../src/shared/utils/password';

const app = createApp();
const prefix = `test-verif-${Date.now()}`;
let counter = 0;
const bearer = (token: string) => `Bearer ${token}`;

const pdf = (label = 'doc') => Buffer.from(`%PDF-1.4\n${label}\n%%EOF`);
const png = () => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

let admin: { token: string };
let subjectId: string;

async function register(role: 'STUDENT' | 'TUTOR') {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      email: `${prefix}-${++counter}@example.com`,
      password: 'Secret123',
      fullName: 'Verif Tutor',
      role,
    });
  return { token: res.body.data.accessToken as string };
}

// A tutor with a (draft, online) profile, which is all verification needs.
async function tutorWithProfile() {
  const tutor = await register('TUTOR');
  const res = await request(app)
    .put('/api/v1/tutors/me')
    .set('Authorization', bearer(tutor.token))
    .send({
      headline: 'Physics tutor for FSc students',
      bio: 'I teach physics and mathematics with a focus on exam preparation and concepts.',
      qualification: 'MSc Physics',
      experienceYears: 3,
      hourlyRate: 800,
      teachingMode: 'ONLINE',
      subjectIds: [subjectId],
    });
  return { ...tutor, tutorId: res.body.data.tutor.id as string };
}

const upload = (token: string, type: string, file: Buffer, filename = 'scan.pdf') =>
  request(app)
    .post('/api/v1/verification/documents')
    .set('Authorization', bearer(token))
    .field('type', type)
    .attach('file', file, { filename });

async function uploadAll(token: string) {
  await upload(token, 'CNIC_FRONT', png(), 'front.png');
  await upload(token, 'CNIC_BACK', png(), 'back.png');
  await upload(token, 'DEGREE', pdf('degree'), 'degree.pdf');
}

beforeAll(async () => {
  subjectId = (await prisma.subject.findFirstOrThrow()).id;
  const email = `${prefix}-admin@example.com`;
  await prisma.user.create({
    data: {
      email,
      fullName: 'Admin',
      role: 'ADMIN',
      passwordHash: await hashPassword('Secret123'),
    },
  });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Secret123' });
  admin = { token: res.body.data.accessToken };
});

afterAll(async () => {
  // Database rows cascade, but files on disk must be removed explicitly.
  const docs = await prisma.verificationDocument.findMany({
    where: { tutorProfile: { user: { email: { startsWith: prefix } } } },
  });
  await Promise.all(docs.map((d) => documentStorage.remove(d.storedName)));
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe('uploading documents', () => {
  it('requires a tutor account and an existing profile', async () => {
    expect((await request(app).post('/api/v1/verification/documents')).status).toBe(401);

    const student = await register('STUDENT');
    expect((await upload(student.token, 'DEGREE', pdf())).status).toBe(403);

    const noProfile = await register('TUTOR');
    expect((await upload(noProfile.token, 'DEGREE', pdf())).status).toBe(400);
  });

  it('stores the file under a random name and never trusts the original filename', async () => {
    const tutor = await tutorWithProfile();
    const res = await upload(tutor.token, 'DEGREE', pdf(), '../../evil name.pdf');

    expect(res.status).toBe(201);
    expect(res.body.data.document).toMatchObject({ type: 'DEGREE', mimeType: 'application/pdf' });

    const stored = await prisma.verificationDocument.findUniqueOrThrow({
      where: { id: res.body.data.document.id },
    });
    expect(stored.storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(existsSync(documentStorage.pathOf(stored.storedName))).toBe(true);
  });

  it('rejects files whose content is not JPG, PNG or PDF, whatever their name says', async () => {
    const tutor = await tutorWithProfile();
    const res = await upload(
      tutor.token,
      'DEGREE',
      Buffer.from('<script>alert(1)</script>'),
      'a.pdf',
    );
    expect(res.status).toBe(400);
  });

  it('rejects files over 5 MB with 413', async () => {
    const tutor = await tutorWithProfile();
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024 + 1024)]);
    const res = await upload(tutor.token, 'DEGREE', big);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('rejects a missing file and an invalid type', async () => {
    const tutor = await tutorWithProfile();
    const noFile = await request(app)
      .post('/api/v1/verification/documents')
      .set('Authorization', bearer(tutor.token))
      .field('type', 'DEGREE');
    expect(noFile.status).toBe(400);

    expect((await upload(tutor.token, 'PASSPORT', pdf())).status).toBe(400);
  });

  it('replaces the CNIC when the same side is uploaded again', async () => {
    const tutor = await tutorWithProfile();
    const first = await upload(tutor.token, 'CNIC_FRONT', png(), 'one.png');
    const firstStored = await prisma.verificationDocument.findUniqueOrThrow({
      where: { id: first.body.data.document.id },
    });
    await upload(tutor.token, 'CNIC_FRONT', png(), 'two.png');

    const status = await request(app)
      .get('/api/v1/verification/me')
      .set('Authorization', bearer(tutor.token));
    expect(
      status.body.data.documents.filter((d: { type: string }) => d.type === 'CNIC_FRONT'),
    ).toHaveLength(1);
    expect(existsSync(documentStorage.pathOf(firstStored.storedName))).toBe(false);
  });

  it('lets a tutor delete a document', async () => {
    const tutor = await tutorWithProfile();
    const up = await upload(tutor.token, 'OTHER', pdf());
    const id = up.body.data.document.id as string;

    const del = await request(app)
      .delete(`/api/v1/verification/documents/${id}`)
      .set('Authorization', bearer(tutor.token));
    expect(del.status).toBe(200);
    expect(await prisma.verificationDocument.count({ where: { id } })).toBe(0);
  });
});

describe('downloading documents', () => {
  it('allows the owner and admins, and hides the file from everyone else', async () => {
    const owner = await tutorWithProfile();
    const other = await tutorWithProfile();
    const student = await register('STUDENT');
    const up = await upload(owner.token, 'DEGREE', pdf('secret-degree'), 'degree.pdf');
    const url = `/api/v1/verification/documents/${up.body.data.document.id}/file`;

    const mine = await request(app).get(url).set('Authorization', bearer(owner.token));
    expect(mine.status).toBe(200);
    expect(mine.headers['content-type']).toContain('application/pdf');
    expect(mine.headers['content-disposition']).toContain('attachment');
    expect(mine.headers['cache-control']).toContain('no-store');
    expect(mine.body.toString()).toContain('secret-degree');

    expect((await request(app).get(url).set('Authorization', bearer(admin.token))).status).toBe(
      200,
    );
    expect((await request(app).get(url).set('Authorization', bearer(other.token))).status).toBe(
      404,
    );
    expect((await request(app).get(url).set('Authorization', bearer(student.token))).status).toBe(
      404,
    );
    expect((await request(app).get(url)).status).toBe(401);
  });
});

describe('submit and review flow', () => {
  it('cannot submit without CNIC front, CNIC back and a degree', async () => {
    const tutor = await tutorWithProfile();
    await upload(tutor.token, 'CNIC_FRONT', png(), 'front.png');

    const res = await request(app)
      .post('/api/v1/verification/submit')
      .set('Authorization', bearer(tutor.token));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('CNIC back');
  });

  it('goes UNVERIFIED -> PENDING (locked) -> VERIFIED', async () => {
    const tutor = await tutorWithProfile();
    await uploadAll(tutor.token);

    const submitted = await request(app)
      .post('/api/v1/verification/submit')
      .set('Authorization', bearer(tutor.token));
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.status).toBe('PENDING');

    // While pending the tutor can neither change documents nor submit twice.
    expect((await upload(tutor.token, 'OTHER', pdf())).status).toBe(409);
    expect(
      (
        await request(app)
          .post('/api/v1/verification/submit')
          .set('Authorization', bearer(tutor.token))
      ).status,
    ).toBe(409);

    const list = await request(app)
      .get('/api/v1/verification/requests')
      .set('Authorization', bearer(admin.token));
    expect(list.status).toBe(200);
    expect(list.body.data.some((r: { tutorId: string }) => r.tutorId === tutor.tutorId)).toBe(true);

    const detail = await request(app)
      .get(`/api/v1/verification/requests/${tutor.tutorId}`)
      .set('Authorization', bearer(admin.token));
    expect(detail.body.data.documents).toHaveLength(3);

    const approved = await request(app)
      .post(`/api/v1/verification/requests/${tutor.tutorId}/approve`)
      .set('Authorization', bearer(admin.token));
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('VERIFIED');

    const again = await request(app)
      .post(`/api/v1/verification/requests/${tutor.tutorId}/approve`)
      .set('Authorization', bearer(admin.token));
    expect(again.status).toBe(409);

    // Verified tutors cannot swap their documents afterwards.
    expect((await upload(tutor.token, 'OTHER', pdf())).status).toBe(409);
  });

  it('shows the verified badge on the public profile', async () => {
    const tutor = await tutorWithProfile();
    await uploadAll(tutor.token);
    await request(app)
      .post('/api/v1/verification/submit')
      .set('Authorization', bearer(tutor.token));
    await request(app)
      .post(`/api/v1/verification/requests/${tutor.tutorId}/approve`)
      .set('Authorization', bearer(admin.token));
    await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send({
        headline: 'Physics tutor for FSc students',
        bio: 'I teach physics and mathematics with a focus on exam preparation and concepts.',
        qualification: 'MSc Physics',
        experienceYears: 3,
        hourlyRate: 800,
        teachingMode: 'ONLINE',
        subjectIds: [subjectId],
        isPublished: true,
      });

    const pub = await request(app).get(`/api/v1/tutors/${tutor.tutorId}`);
    expect(pub.body.data.tutor.verificationStatus).toBe('VERIFIED');
  });

  it('keeps verification when the tutor edits their profile', async () => {
    const tutor = await tutorWithProfile();
    await uploadAll(tutor.token);
    await request(app)
      .post('/api/v1/verification/submit')
      .set('Authorization', bearer(tutor.token));
    await request(app)
      .post(`/api/v1/verification/requests/${tutor.tutorId}/approve`)
      .set('Authorization', bearer(admin.token));

    const edit = await request(app)
      .put('/api/v1/tutors/me')
      .set('Authorization', bearer(tutor.token))
      .send({
        headline: 'Physics tutor, new headline',
        bio: 'I teach physics and mathematics with a focus on exam preparation and concepts.',
        qualification: 'MSc Physics',
        experienceYears: 4,
        hourlyRate: 900,
        teachingMode: 'ONLINE',
        subjectIds: [subjectId],
      });
    expect(edit.body.data.tutor.verificationStatus).toBe('VERIFIED');
  });

  it('rejection needs a reason, shows it to the tutor and allows a fresh submission', async () => {
    const tutor = await tutorWithProfile();
    await uploadAll(tutor.token);
    await request(app)
      .post('/api/v1/verification/submit')
      .set('Authorization', bearer(tutor.token));
    const url = `/api/v1/verification/requests/${tutor.tutorId}/reject`;

    expect(
      (await request(app).post(url).set('Authorization', bearer(admin.token)).send({})).status,
    ).toBe(400);

    const rejected = await request(app)
      .post(url)
      .set('Authorization', bearer(admin.token))
      .send({ reason: 'CNIC image is blurry' });
    expect(rejected.body.data.status).toBe('REJECTED');

    const mine = await request(app)
      .get('/api/v1/verification/me')
      .set('Authorization', bearer(tutor.token));
    expect(mine.body.data).toMatchObject({ status: 'REJECTED', note: 'CNIC image is blurry' });

    expect((await upload(tutor.token, 'CNIC_FRONT', png(), 'better.png')).status).toBe(201);
    const resubmit = await request(app)
      .post('/api/v1/verification/submit')
      .set('Authorization', bearer(tutor.token));
    expect(resubmit.body.data).toMatchObject({ status: 'PENDING', note: null });
  });

  it('is admin-only and validates ids', async () => {
    const tutor = await tutorWithProfile();
    const approve = `/api/v1/verification/requests/${tutor.tutorId}/approve`;

    expect(
      (await request(app).post(approve).set('Authorization', bearer(tutor.token))).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get('/api/v1/verification/requests')
          .set('Authorization', bearer(tutor.token))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/v1/verification/requests/nope/approve')
          .set('Authorization', bearer(admin.token))
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/v1/verification/requests/00000000-0000-4000-8000-000000000000/approve')
          .set('Authorization', bearer(admin.token))
      ).status,
    ).toBe(404);
    // Not submitted yet, so there is nothing to approve.
    expect(
      (await request(app).post(approve).set('Authorization', bearer(admin.token))).status,
    ).toBe(409);
  });
});
