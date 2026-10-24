import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KaamConnect — Local skills. Fair prices.',
  description: 'Find trusted local service professionals and agree on a fair price.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
