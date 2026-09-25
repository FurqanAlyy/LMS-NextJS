export function money(amount: number, labelFree = true) {
  return labelFree && amount === 0
    ? "Free"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
}
export function duration(seconds: number) {
  return `${Math.max(1, Math.ceil(seconds / 60))} min`;
}
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function progress(completedIds: string[], lessonIds: string[]) {
  const valid = new Set(lessonIds);
  const completed = [...new Set(completedIds)].filter((id) => valid.has(id));
  return {
    completedLessons: completed,
    progress: valid.size
      ? Math.round((completed.length / valid.size) * 100)
      : 0,
  };
}
export function safeCallback(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/dashboard";
}
export function serialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
