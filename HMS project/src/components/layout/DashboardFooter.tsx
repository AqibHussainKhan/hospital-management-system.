import type { ReactNode } from "react";
import { Activity, ArrowUp, ArrowUpRight } from "lucide-react";
import "./dashboard-footer.css";

// Paste your full profile URLs between the quotes, then save this file.
// For WhatsApp use: https://wa.me/ followed by your number with country code.
// Empty URLs keep the icons visible without sending visitors to a dummy page.
const footerLinks = {
  github: "https://github.com/AqibHussainKhan",
  linkedin: "https://www.linkedin.com/in/aqib-hussain-khan-b92311408",
  instagram: "https://www.instagram.com/aqibkhansehol.1/?hl=en",
  whatsapp: "https://wa.me/923087481640",
  portfolio: " https://aqibhussainkhan.github.io/Aqib-portfolio/",
};

const developerName = "Aqib Hussain";
const socials = [
  { key: "github", label: "GitHub" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;

function SocialIcon({ platform }: { platform: typeof socials[number]["key"] }) {
  if (platform === "github") return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.82.58A12 12 0 0 0 12 .3Z" />
    </svg>
  );
  if (platform === "linkedin") return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="4.5" cy="4.5" r="2.2" />
      <path d="M2.6 8h3.8v13H2.6ZM9 8h3.7v1.8c.8-1.3 2-2.1 3.8-2.1 3.6 0 4.5 2.2 4.5 5.6V21h-3.8v-6.8c0-1.7-.2-3.3-2.2-3.3s-2.3 1.5-2.3 3.2V21H9Z" />
    </svg>
  );
  if (platform === "instagram") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="url(#hms-footer-instagram)" strokeWidth="2" aria-hidden="true">
      <defs>
        <linearGradient id="hms-footer-instagram" x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#f59e0b" /><stop offset="0.5" stopColor="#ec4899" /><stop offset="1" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="url(#hms-footer-instagram)" stroke="none" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 11.8a8.6 8.6 0 0 1-12.7 7.6L3 21l1.6-4.6A8.6 8.6 0 1 1 20.5 11.8Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M8.1 7.3c.2-.3.5-.3.8-.2l1.2 2c.1.2.1.5-.1.7l-.8.8c.7 1.5 1.8 2.6 3.4 3.3l.8-1c.2-.2.4-.3.7-.1l2 1c.3.1.3.4.3.6-.1 1.1-1 2-2.1 2-3.4-.1-7.5-4.2-7.5-7.3 0-.7.5-1.5 1.3-1.8Z" fill="currentColor" />
    </svg>
  );
}

function FooterLink({ href, label, className, children }: {
  href: string;
  label: string;
  className: string;
  children: ReactNode;
}) {
  const url = href.trim();
  return (
    <a
      href={url || undefined}
      aria-label={label}
      aria-disabled={!url || undefined}
      tabIndex={url ? undefined : -1}
      target={url ? "_blank" : undefined}
      rel={url ? "noopener noreferrer" : undefined}
      className={`${className} ${url ? "is-linked" : "is-unlinked"}`}
    >
      {children}
    </a>
  );
}

export default function DashboardFooter() {
  function backToTop() {
    const reducedMotion = document.documentElement.dataset.hmsMotion === "reduced";
    document.getElementById("dashboard-overview")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
  }

  return (
    <footer className="hms-social-footer" aria-label="Dashboard footer">
      <div className="hms-footer-main">
        <div className="hms-footer-brand">
          <svg className="hms-footer-cross" viewBox="0 0 200 200" fill="none" aria-hidden="true">
            <path d="M76 16h48a12 12 0 0 1 12 12v36h36a12 12 0 0 1 12 12v48a12 12 0 0 1-12 12h-36v36a12 12 0 0 1-12 12H76a12 12 0 0 1-12-12v-36H28a12 12 0 0 1-12-12V76a12 12 0 0 1 12-12h36V28a12 12 0 0 1 12-12Z" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          <div className="hms-footer-lockup">
            <span className="hms-footer-logo"><Activity size={29} strokeWidth={2} aria-hidden="true" /></span>
            <div className="hms-footer-brand-copy">
              <p className="hms-footer-wordmark">Medi<span>Core</span></p>
              <p className="hms-footer-subtitle">Hospital Management System</p>
            </div>
          </div>
          <p className="hms-footer-tagline">Better care.<br /><span>Connected teams.</span></p>
          <p className="hms-footer-description">One workspace for patient care and hospital operations.</p>
        </div>

        <section className="hms-footer-connect" aria-labelledby="hms-footer-connect-title">
          <h2 id="hms-footer-connect-title">Let’s connect</h2>
          <p className="hms-footer-connect-caption">Find me on social media.</p>
          <div className="hms-footer-socials" role="group" aria-label="Social profiles">
            {socials.map(({ key, label }) => (
              <FooterLink key={key} href={footerLinks[key]} label={label} className={`hms-footer-social hms-footer-${key}`}>
                <span className="hms-footer-social-icon"><SocialIcon platform={key} /></span>
                <span className="hms-footer-social-name">{label}</span>
              </FooterLink>
            ))}
          </div>
          <FooterLink href={footerLinks.portfolio} label="View portfolio" className="hms-footer-portfolio">
            View portfolio <ArrowUpRight size={17} aria-hidden="true" />
          </FooterLink>
        </section>
      </div>

      <div className="hms-footer-bottom">
        <p className="hms-footer-copyright">© {new Date().getFullYear()} MediCore. All rights reserved.</p>
        <p className="hms-footer-credit">Designed &amp; developed by <span>{developerName}</span></p>
        <button type="button" onClick={backToTop} className="hms-footer-top">
          <ArrowUp size={16} aria-hidden="true" /> Back to top
        </button>
      </div>
    </footer>
  );
}
