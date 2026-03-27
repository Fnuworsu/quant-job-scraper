import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quant Board',
  description: 'A simple board for quant jobs, programs, and events.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <header className="header">
            <Link href="/" className="brand">
              <span className="brand-mark">QB</span>
              <div>
                <p className="brand-name">Quant Board</p>
                <p className="brand-subtitle">Careers, programs, and events</p>
              </div>
            </Link>

            <nav className="nav">
              <Link href="/" className="nav-link">Board</Link>
            </nav>
          </header>

          <main className="main-content">
            {children}
          </main>

          <footer className="footer">
            <div className="footer-content">
              <p className="footer-note">Copyright Felix Noos</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
