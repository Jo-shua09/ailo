export default function Loading() {
  return (
    <main
      className="min-h-screen bg-[#f4f6f9] px-4 py-8 sm:px-8"
      role="status"
      aria-label="Loading page"
      aria-busy="true"
    >
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-10 w-48 rounded-xl bg-white" />
        <div className="h-28 rounded-2xl bg-white" />
        <div className="h-52 rounded-2xl bg-white" />
      </div>
    </main>
  );
}
