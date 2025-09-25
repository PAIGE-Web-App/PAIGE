import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Paige',
  description: 'Create your Paige wedding planning account',
};

// Prevent caching of signup page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
