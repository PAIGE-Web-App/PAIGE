import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Paige',
  description: 'Login to your Paige wedding planning account',
};

// Prevent caching of login page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
