import { pageUser } from "@/lib/auth";
import {
  studentEnrollments,
  StudentCourses,
} from "@/components/student-courses";
export const metadata = { title: "My courses" };
export default async function MyCourses() {
  const user = await pageUser();
  const enrollments = await studentEnrollments(String(user._id));
  return (
    <div className="container-page py-12">
      <p className="eyebrow mb-3">MAKE TIME FOR YOURSELF</p>
      <h1 className="heading mb-3">My courses</h1>
      <p className="mb-9 text-muted">
        Your collection of new possibilities. {enrollments.length} courses
        enrolled.
      </p>
      <StudentCourses enrollments={enrollments} />
    </div>
  );
}
