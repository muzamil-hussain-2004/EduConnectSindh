import { baseApi } from '@/services/api/baseApi';
import { paged, unwrap } from '@/features/catalog/catalogApi';
import type {
  ApiSuccess,
  DocumentType,
  MyVerification,
  Paged,
  VerificationDocument,
  VerificationRequestDetail,
  VerificationRequestItem,
} from '@/types/api';

export const verificationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyVerification: build.query<MyVerification, void>({
      query: () => '/verification/me',
      transformResponse: unwrap,
      providesTags: ['Verification'],
    }),
    uploadDocument: build.mutation<VerificationDocument, { type: DocumentType; file: File }>({
      query: ({ type, file }) => {
        const body = new FormData();
        body.append('type', type);
        body.append('file', file);
        return { url: '/verification/documents', method: 'POST', body };
      },
      transformResponse: (res: ApiSuccess<{ document: VerificationDocument }>) => res.data.document,
      invalidatesTags: ['Verification'],
    }),
    deleteDocument: build.mutation<void, string>({
      query: (id) => ({ url: `/verification/documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Verification'],
    }),
    submitVerification: build.mutation<void, void>({
      query: () => ({ url: '/verification/submit', method: 'POST', body: {} }),
      invalidatesTags: ['Verification', 'MyProfile'],
    }),
    listVerificationRequests: build.query<
      Paged<VerificationRequestItem>,
      { status?: 'PENDING' | 'VERIFIED' | 'REJECTED'; page?: number }
    >({
      query: (params) => ({ url: '/verification/requests', params }),
      transformResponse: (res: ApiSuccess<VerificationRequestItem[]>) => paged(res),
      providesTags: ['Verification'],
    }),
    getVerificationRequest: build.query<VerificationRequestDetail, string>({
      query: (id) => `/verification/requests/${id}`,
      transformResponse: unwrap,
      providesTags: ['Verification'],
    }),
    decideVerification: build.mutation<
      void,
      { id: string; action: 'approve' | 'reject'; reason?: string }
    >({
      query: ({ id, action, reason }) => ({
        url: `/verification/requests/${id}/${action}`,
        method: 'POST',
        body: action === 'reject' ? { reason } : {},
      }),
      invalidatesTags: ['Verification', 'Tutor'],
    }),
  }),
});

export const {
  useGetMyVerificationQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
  useSubmitVerificationMutation,
  useListVerificationRequestsQuery,
  useGetVerificationRequestQuery,
  useDecideVerificationMutation,
} = verificationApi;
