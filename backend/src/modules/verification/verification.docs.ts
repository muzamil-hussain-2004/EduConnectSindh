const security = [{ bearerAuth: [] }];
const json = (schema: unknown) => ({ 'application/json': { schema } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};
const common = {
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
};

export const verificationSchemas = {
  VerificationDocument: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      type: { type: 'string', enum: ['CNIC_FRONT', 'CNIC_BACK', 'DEGREE', 'OTHER'] },
      originalName: { type: 'string' },
      mimeType: { type: 'string', example: 'application/pdf' },
      sizeBytes: { type: 'integer' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  VerificationStatusResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'] },
          note: { type: 'string', nullable: true, description: "Admin's reason when rejected" },
          reviewedAt: { type: 'string', format: 'date-time', nullable: true },
          documents: { type: 'array', items: ref('VerificationDocument') },
        },
      },
    },
  },
  UploadDocumentRequest: {
    type: 'object',
    required: ['type', 'file'],
    properties: {
      type: { type: 'string', enum: ['CNIC_FRONT', 'CNIC_BACK', 'DEGREE', 'OTHER'] },
      file: { type: 'string', format: 'binary', description: 'JPG, PNG or PDF, max 5 MB' },
    },
  },
  RejectRequest: {
    type: 'object',
    required: ['reason'],
    properties: { reason: { type: 'string', example: 'CNIC image is blurry, please re-upload' } },
  },
};

export const verificationPaths = {
  '/api/v1/verification/me': {
    get: {
      tags: ['Verification'],
      summary: 'My verification status and documents (tutor)',
      security,
      responses: {
        '200': { description: 'Status', content: json(ref('VerificationStatusResponse')) },
        '404': { $ref: '#/components/responses/NotFound' },
        ...common,
      },
    },
  },
  '/api/v1/verification/documents': {
    post: {
      tags: ['Verification'],
      summary: 'Upload a document (tutor)',
      description:
        'multipart/form-data. Allowed only while UNVERIFIED or REJECTED. Uploading CNIC_FRONT or CNIC_BACK again replaces the old file.',
      security,
      requestBody: {
        required: true,
        content: { 'multipart/form-data': { schema: ref('UploadDocumentRequest') } },
      },
      responses: {
        '201': { description: 'Uploaded' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '409': { description: 'Documents are under review or already verified' },
        '413': { description: 'File larger than 5 MB' },
        ...common,
      },
    },
  },
  '/api/v1/verification/documents/{id}': {
    delete: {
      tags: ['Verification'],
      summary: 'Delete one of my documents (tutor)',
      security,
      parameters: [idParam],
      responses: {
        '200': { description: 'Deleted' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { description: 'Documents are under review or already verified' },
        ...common,
      },
    },
  },
  '/api/v1/verification/documents/{id}/file': {
    get: {
      tags: ['Verification'],
      summary: 'Download a document (owner or admin)',
      security,
      parameters: [idParam],
      responses: {
        '200': { description: 'The file (as an attachment)' },
        '404': { $ref: '#/components/responses/NotFound' },
        ...common,
      },
    },
  },
  '/api/v1/verification/submit': {
    post: {
      tags: ['Verification'],
      summary: 'Submit documents for review (tutor)',
      description:
        'Requires CNIC front, CNIC back and at least one degree. Status becomes PENDING.',
      security,
      responses: {
        '200': { description: 'Submitted', content: json(ref('VerificationStatusResponse')) },
        '400': { $ref: '#/components/responses/BadRequest' },
        '409': { description: 'Already submitted or verified' },
        ...common,
      },
    },
  },
  '/api/v1/verification/requests': {
    get: {
      tags: ['Verification'],
      summary: 'List verification requests (admin)',
      security,
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
        },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
      ],
      responses: { '200': { description: 'Paginated requests, oldest first' }, ...common },
    },
  },
  '/api/v1/verification/requests/{id}': {
    get: {
      tags: ['Verification'],
      summary: 'One request with its documents (admin). `id` is the tutor profile id',
      security,
      parameters: [idParam],
      responses: {
        '200': { description: 'Request details' },
        '404': { $ref: '#/components/responses/NotFound' },
        ...common,
      },
    },
  },
  '/api/v1/verification/requests/{id}/approve': {
    post: {
      tags: ['Verification'],
      summary: 'Approve a pending request (admin)',
      security,
      parameters: [idParam],
      responses: {
        '200': { description: 'Tutor is now VERIFIED' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { description: 'Request is not pending' },
        ...common,
      },
    },
  },
  '/api/v1/verification/requests/{id}/reject': {
    post: {
      tags: ['Verification'],
      summary: 'Reject a pending request with a reason (admin)',
      security,
      parameters: [idParam],
      requestBody: { required: true, content: json(ref('RejectRequest')) },
      responses: {
        '200': { description: 'Tutor is now REJECTED and can re-upload' },
        '400': { $ref: '#/components/responses/BadRequest' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { description: 'Request is not pending' },
        ...common,
      },
    },
  },
};
