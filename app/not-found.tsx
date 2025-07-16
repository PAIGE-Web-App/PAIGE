export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-linen">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-lg text-[#332B42] mb-8">Sorry, the page you are looking for does not exist.</p>
      <a href="/" className="btn-primary">Go Home</a>
    </div>
  );
} 