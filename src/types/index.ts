export type CategoryData = {
  _id: string;
  name: string;
  slug: string;
  description: string;
};
export type CourseData = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnail: string;
  price: number;
  category: CategoryData | null;
  instructor: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  published: boolean;
  archived: boolean;
  createdAt: string;
};
export type LessonData = {
  _id: string;
  title: string;
  description: string;
  duration: number;
  order: number;
  isPreview: boolean;
  courseId: string;
  videoPublicId?: string;
};
export type EnrollmentData = {
  _id: string;
  courseId: CourseData;
  progress: number;
  completedLessons: string[];
  enrolledAt: string;
};
