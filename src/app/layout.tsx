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
              <a href="#subscribe" className="nav-link highlight">SUBSCRIBE</a>
            </nav>
          </header>
          <main className="main-content">
            {children}
          </main>
          <footer className="footer" id="subscribe">
            <div className="footer-content">
              <div className="subscribe-box">
                <h3>NOTIFY ME</h3>
                <p>Get automated email alerts when new quant jobs are posted.</p>
                <form className="subscribe-form" action="mailto:admin@example.com" method="get">
                  {/* Ideally this would hit a real Next.js API route or serverless function */}
                  <input type="email" placeholder="ENTER_EMAIL" className="input-neo" required />
                  <button type="submit" className="button-neo">CONNECT[]</button>
                </form>
              </div>
              <div className="system-status">
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
