import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Users
} from "lucide-react";
import "./Login.css";

export function AuthShell({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <main className="mc-auth">
      <div className="mc-auth-background" aria-hidden="true" />

      <motion.div
        className="mc-auth-frame"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <section
          className="mc-auth-story"
          aria-label="MediCore hospital portal"
        >
          <div className="mc-auth-brand">
            <span className="mc-auth-logo">
              <Activity size={23} strokeWidth={2.4} />
            </span>

            <div>
              <strong>MediCore<span>®</span></strong>
              <small>HOSPITAL MANAGEMENT</small>
            </div>
          </div>

          <div className="mc-auth-story-body">
            <div className="mc-auth-eyebrow">
              <span /> YOUR HOSPITAL. CONNECTED.
            </div>

            <h1>
              More care.
              <br />
              <span>Less complexity.</span>
            </h1>

            <p>
              A clearer way to manage patients, coordinate your team, and keep hospital operations moving.
            </p>

            <div className="mc-auth-visual" aria-hidden="true">
              <div className="mc-auth-orbit mc-auth-orbit-one" />
              <div className="mc-auth-orbit mc-auth-orbit-two" />

              <div className="mc-auth-cross">
                <HeartPulse size={48} strokeWidth={1.35} />
              </div>

              <div className="mc-auth-mini-card mc-auth-patients">
                <span className="mc-auth-mini-icon">
                  <Users size={17} />
                </span>

                <div>
                  <strong>Patient care</strong>
                  <small>One connected workspace</small>
                </div>

                <ArrowUpRight size={15} />
              </div>

              <div className="mc-auth-mini-card mc-auth-team">
                <span className="mc-auth-mini-icon">
                  <Stethoscope size={17} />
                </span>

                <div>
                  <strong>Your team, together</strong>
                  <small>Built around better care</small>
                </div>
              </div>

              <span className="mc-auth-visual-dot mc-auth-dot-one" />
              <span className="mc-auth-visual-dot mc-auth-dot-two" />
            </div>

            <div className="mc-auth-modules">
              <span><Users size={15} /> Patients</span>
              <span><CalendarDays size={15} /> Appointments</span>
              <span><Stethoscope size={15} /> Departments</span>
            </div>
          </div>

          <div className="mc-auth-story-footer">
            <ShieldCheck size={16} />
            <span>Access for authorized hospital staff</span>
            <span className="mc-auth-footer-line" />
          </div>
        </section>

        <section
          className="mc-auth-panel"
          aria-label="Hospital account access"
        >
          {children}
        </section>
      </motion.div>

      <footer className="mc-auth-page-footer">
        <span>© {new Date().getFullYear()} MediCore</span>
        <span>Hospital Management System</span>
      </footer>
    </main>
  );
}

export function AuthMessage({ error, notice }: { error: string; notice: string }) {
  return (
    <div
      className="mc-auth-messages"
      aria-live="polite"
      aria-atomic="true"
    >
      {error && (
        <p className="mc-auth-message mc-auth-error" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="mc-auth-message mc-auth-success" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.61 4.61 0 0 1-2 3.03v2.52h3.24c1.89-1.74 2.98-4.3 2.98-7.38Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.39l-3.24-2.52c-.9.6-2.04.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.08v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.94A6.01 6.01 0 0 1 6.09 12c0-.67.11-1.32.32-1.94v-2.6H3.08A10 10 0 0 0 2 12c0 1.61.39 3.14 1.08 4.54l3.33-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.51 3.82 1.51l2.86-2.86A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.92 5.46l3.33 2.6C7.2 7.7 9.4 5.94 12 5.94Z"
      />
    </svg>
  );
}