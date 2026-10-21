import { baseApi } from '@/services/api/baseApi';
import { paged, unwrap } from '@/features/catalog/catalogApi';
import type { ApiSuccess, Paged } from '@/types/api';

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface LessonOutline {
  id: string;
  title: string;
  durationMin: number;
  position: number;
}

export interface LessonFull extends LessonOutline {
  content: string;
  videoUrl: string | null;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: CourseLevel;
  price: number;
  status: 'DRAFT' | 'PUBLISHED';
  subject: { id: string; name: string };
  tutor: {
    id: string;
    fullName: string;
    headline: string;
    ratingAvg: number | null;
    verificationStatus: string;
  };
  lessonCount: number;
  totalDurationMin: number;
  enrollmentCount: number;
  lessons: LessonOutline[];
  createdAt: string;
}

export interface CourseManage extends Omit<Course, 'lessons'> {
  lessons: LessonFull[];
}

export interface Progress {
  completed: number;
  total: number;
  percent: number;
}

export type EnrollmentState =
  | { enrolled: false }
  | { enrolled: true; enrolledAt: string; completedLessonIds: string[]; progress: Progress };

export interface MyEnrollment {
  enrolledAt: string;
  course: Course;
  progress: Progress;
}

export interface CourseSearchParams {
  q?: string;
  subjectId?: string;
  level?: CourseLevel;
  freeOnly?: boolean;
  sort?: 'newest' | 'popular' | 'priceAsc' | 'priceDesc';
  page?: number;
  limit?: number;
}

export interface CourseInput {
  title: string;
  description: string;
  subjectId: string;
  level: CourseLevel;
  price: number;
}

export interface LessonInput {
  title: string;
  content: string;
  videoUrl?: string;
  durationMin: number;
}

const course = (res: ApiSuccess<{ course: Course }>) => res.data.course;
const lesson = (res: ApiSuccess<{ lesson: LessonFull }>) => res.data.lesson;

export const coursesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchCourses: build.query<Paged<Course>, CourseSearchParams>({
      query: (params) => ({ url: '/courses', params }),
      transformResponse: (res: ApiSuccess<Course[]>) => paged(res),
      providesTags: ['Courses'],
    }),
    getCourse: build.query<Course, string>({
      query: (id) => `/courses/${id}`,
      transformResponse: course,
      providesTags: ['Courses'],
    }),
    getCourseManage: build.query<CourseManage, string>({
      query: (id) => `/courses/${id}/manage`,
      transformResponse: (res: ApiSuccess<{ course: CourseManage }>) => res.data.course,
      providesTags: ['Courses'],
    }),
    getMyCourses: build.query<Course[], void>({
      query: () => '/courses/mine',
      transformResponse: unwrap,
      providesTags: ['Courses'],
    }),
    createCourse: build.mutation<Course, CourseInput>({
      query: (body) => ({ url: '/courses', method: 'POST', body }),
      transformResponse: course,
      invalidatesTags: ['Courses'],
    }),
    updateCourse: build.mutation<Course, { id: string; body: Partial<CourseInput> }>({
      query: ({ id, body }) => ({ url: `/courses/${id}`, method: 'PATCH', body }),
      transformResponse: course,
      invalidatesTags: ['Courses'],
    }),
    deleteCourse: build.mutation<null, string>({
      query: (id) => ({ url: `/courses/${id}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: ['Courses'],
    }),
    setCoursePublished: build.mutation<Course, { id: string; publish: boolean }>({
      query: ({ id, publish }) => ({
        url: `/courses/${id}/${publish ? 'publish' : 'unpublish'}`,
        method: 'POST',
      }),
      transformResponse: course,
      invalidatesTags: ['Courses'],
    }),
    addLesson: build.mutation<LessonFull, { courseId: string; body: LessonInput }>({
      query: ({ courseId, body }) => ({
        url: `/courses/${courseId}/lessons`,
        method: 'POST',
        body,
      }),
      transformResponse: lesson,
      invalidatesTags: ['Courses'],
    }),
    updateLesson: build.mutation<
      LessonFull,
      { courseId: string; lessonId: string; body: Partial<LessonInput> }
    >({
      query: ({ courseId, lessonId, body }) => ({
        url: `/courses/${courseId}/lessons/${lessonId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: lesson,
      invalidatesTags: ['Courses'],
    }),
    deleteLesson: build.mutation<null, { courseId: string; lessonId: string }>({
      query: ({ courseId, lessonId }) => ({
        url: `/courses/${courseId}/lessons/${lessonId}`,
        method: 'DELETE',
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Courses'],
    }),
    getLesson: build.query<LessonFull, { courseId: string; lessonId: string }>({
      query: ({ courseId, lessonId }) => `/courses/${courseId}/lessons/${lessonId}`,
      transformResponse: lesson,
      providesTags: ['Courses'],
    }),
    getEnrollment: build.query<EnrollmentState, string>({
      query: (id) => `/courses/${id}/enrollment`,
      transformResponse: unwrap,
      providesTags: ['Enrollments'],
    }),
    enroll: build.mutation<EnrollmentState, string>({
      query: (id) => ({ url: `/courses/${id}/enroll`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: ['Enrollments', 'Courses'],
    }),
    unenroll: build.mutation<null, string>({
      query: (id) => ({ url: `/courses/${id}/enroll`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: ['Enrollments', 'Courses'],
    }),
    setLessonDone: build.mutation<
      EnrollmentState,
      { courseId: string; lessonId: string; done: boolean }
    >({
      query: ({ courseId, lessonId, done }) => ({
        url: `/courses/${courseId}/lessons/${lessonId}/complete`,
        method: done ? 'POST' : 'DELETE',
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Enrollments'],
    }),
    getMyEnrollments: build.query<Paged<MyEnrollment>, { page?: number } | void>({
      query: (params) => ({ url: '/enrollments/mine', params: params ?? undefined }),
      transformResponse: (res: ApiSuccess<MyEnrollment[]>) => paged(res),
      providesTags: ['Enrollments'],
    }),
  }),
});

export const {
  useSearchCoursesQuery,
  useGetCourseQuery,
  useGetCourseManageQuery,
  useGetMyCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useSetCoursePublishedMutation,
  useAddLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useGetLessonQuery,
  useGetEnrollmentQuery,
  useEnrollMutation,
  useUnenrollMutation,
  useSetLessonDoneMutation,
  useGetMyEnrollmentsQuery,
} = coursesApi;
