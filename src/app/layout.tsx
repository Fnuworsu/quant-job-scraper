import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quant Board',
  description: 'A curated dashboard of quant and prop trading internships and programs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <header className="header">
            <div className="logo">
              <span className="cursor-block">_</span>QUANT<span className="accent">BOARD</span>
            </div>
            <nav className="nav">
              <a href="/" className="nav-link">INTERNSHIPS</a>
              <a href="/programs" className="nav-link">PROGRAMS</a>
            </nav>
          </header>
          <main className="main-content">
            {children}
          </main>
          <footer className="footer">
            <div className="footer-content">
              <div className="system-status" style={{ width: '100%', textAlign: 'center' }}>
                <span className="status-dot"></span> SYSTEM: ONLINE <br/>
                <span className="update-time">LAST UPDATE: UTC 12:00:00</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
