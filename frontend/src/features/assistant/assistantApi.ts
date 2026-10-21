import { baseApi } from '@/services/api/baseApi';
import type { ApiSuccess } from '@/types/api';

export interface AssistantAnswer {
  answer: string;
  sources: { lessonId: string; title: string }[];
  provider: 'llm' | 'local';
}

export const assistantApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    askAssistant: build.mutation<
      AssistantAnswer,
      { courseId: string; question: string; lessonId?: string }
    >({
      query: ({ courseId, ...body }) => ({
        url: `/courses/${courseId}/assistant`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: ApiSuccess<AssistantAnswer>) => res.data,
    }),
  }),
});

export const { useAskAssistantMutation } = assistantApi;
