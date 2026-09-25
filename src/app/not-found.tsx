import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="eyebrow">404 · Page not found</p>
      <h1 className="heading my-5">A different path awaits.</h1>
      <Link href="/courses" className="btn">
        Explore courses
      </Link>
    </div>
  );
}
