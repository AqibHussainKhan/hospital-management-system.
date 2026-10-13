import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { FormEvent } from "react";

import { AnimatePresence, motion } from "framer-motion";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Pause,
  Pill,
  Play,
  Stethoscope,
  Users,
} from "lucide-react";

import {
  HospitalAuthProvider,
  useHospitalAuth,
  useOptionalHospitalAuth,
} from "../../features/auth/HospitalAuthProvider";

import type { HospitalUser } from "../../features/auth/authService";

import { GoogleMark } from "./AuthShell";

interface LoginPageProps {
  onLogin?: (user: HospitalUser) => void;
}

const hospitalImage = `${import.meta.env.BASE_URL}images/hms-login-hospital.png`;

const rememberedEmailKey = "hms:midnight-login:email";

const slideInterval = 6500;

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeMotionPreference(notify: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

function motionPreferenceSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function useLoginReducedMotion() {
  return useSyncExternalStore(
    subscribeMotionPreference,
    motionPreferenceSnapshot,
    () => false,
  );
}

const hospitalSlides = [
  {
    label: "CONNECTED HOSPITAL CARE",
    title: ["Better care.", "Connected teams."],
    description:
      "Manage patients, doctors and appointments in one organized hospital workspace.",
    features: [
      { label: "Patients", icon: Users },
      { label: "Doctors", icon: Stethoscope },
      { label: "Appointments", icon: CalendarDays },
    ],
  },
  {
    label: "EVERY DEPARTMENT, TOGETHER",
    title: ["One workspace.", "Every department."],
    description:
      "Coordinate laboratory requests, pharmacy services, wards and the operation theater.",
    features: [
      { label: "Laboratory", icon: FlaskConical },
      { label: "Pharmacy", icon: Pill },
      { label: "Wards & Surgery", icon: BedDouble },
    ],
  },
  {
    label: "HOSPITAL ADMINISTRATION",
    title: ["Your team.", "One clearer view."],
    description:
      "Keep staff attendance, billing and hospital reports organized for everyday operations.",
    features: [
      { label: "Attendance", icon: ClipboardCheck },
      { label: "Billing", icon: CreditCard },
      { label: "Reports", icon: FileText },
    ],
  },
] as const;

function readRememberedEmail() {
  try {
    return localStorage.getItem(rememberedEmailKey) || "";
  } catch {
    return "";
  }
}

// Scoped styles keep the login's midnight palette independent of dashboard themes.

const loginStyles = `
.mt-login {
  --mt-bg: #081321;
  --mt-field: #101f31;
  --mt-mint: #63e6d2;
  --mt-text: #f5f8fc;
  --mt-muted: #a8b9cb;
  --mt-border: #35495f;
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(340px, 1fr);
  gap: clamp(24px, 3.5vw, 60px);
  min-height: 100svh;
  padding: 20px;
  overflow-x: clip;
  background: var(--mt-bg);
  color: var(--mt-text);
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}

.mt-login, .mt-login *, .mt-login *::before, .mt-login *::after {
  box-sizing: border-box;
}

.mt-login :where(h1, h2, p) {
  margin: 0;
}

.mt-login :where(button, input) {
  font: inherit;
}

.mt-login button {
  cursor: pointer;
}

.mt-login button:disabled, .mt-login input:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.mt-login :where(button, input):focus-visible {
  outline: 2px solid var(--mt-mint);
  outline-offset: 4px;
}

.mt-story {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: calc(100svh - 40px);
  padding: clamp(28px, 3.2vw, 52px);
  overflow: hidden;
  background: #10283d;
  border: 1px solid #b1e6f21a;
  border-radius: 26px;
}

.mt-story-photo {
  position: absolute;
  inset: 0;
  z-index: -3;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 57% center;
}

.mt-story::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background: linear-gradient(180deg, #03111e24 20%, #0417255e 46%, #051726f5 100%);
}

.mt-story::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(90deg, #03142140, transparent 80%);
}

.mt-brand {
  display: flex;
  align-items: center;
  gap: 15px;
}

.mt-brand-mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 54px;
  height: 54px;
  background: var(--mt-mint);
  color: #071b26;
  border: 1px solid #b6fff180;
  border-radius: 15px;
  box-shadow: 0 8px 30px #030d1820;
}

.mt-brand strong {
  max-width: 440px;
  font-size: clamp(17px, 1.65vw, 24px);
  font-weight: 650;
  letter-spacing: -.65px;
  line-height: 1.3;
}

.mt-story-body {
  margin-top: auto;
  padding-top: 170px;
}

.mt-slide-content {
  min-height: 240px;
}

.mt-eyebrow {
  display: block;
  color: var(--mt-mint);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 2.5px;
  line-height: 1.6;
}

.mt-story h1 {
  margin-top: 16px;
  font-size: clamp(42px, 4.5vw, 74px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -2.8px;
  text-wrap: balance;
}

.mt-story h1 span {
  display: block;
}

.mt-description {
  max-width: 600px;
  margin-top: 19px !important;
  color: #d0e1ef;
  font-size: clamp(15px, 1.3vw, 18px);
  line-height: 1.65;
}

.mt-story-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-top: 25px;
}

.mt-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mt-feature {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 39px;
  padding: 8px 13px;
  border: 1px solid #a6e3ef30;
  border-radius: 999px;
  background: #0a24355c;
  color: #e1edf8;
  font-size: 12px;
  white-space: nowrap;
  backdrop-filter: blur(10px);
}

.mt-feature svg {
  color: var(--mt-mint);
}

.mt-carousel-controls {
  display: flex;
  align-items: center;
  gap: 3px;
}

.mt-icon-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid #9db4c443;
  border-radius: 50%;
  color: #e7f2fc;
  background: #061b2a69;
  transition: background .2s, border-color .2s, color .2s;
}

.mt-icon-button:hover {
  color: var(--mt-mint);
  border-color: #63e6d280;
  background: #0b2b3c;
}

.mt-pagination {
  display: flex;
  align-items: center;
}

.mt-dot {
  display: grid;
  place-items: center;
  width: 32px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
}

.mt-dot span {
  width: 8px;
  height: 7px;
  border-radius: 999px;
  background: #6b8198;
  transition: width .25s, background .25s;
}

.mt-dot[aria-current="true"] span {
  width: 27px;
  background: var(--mt-mint);
}

.mt-pause {
  margin-left: 8px;
  width: 36px;
  height: 36px;
  border-color: transparent;
  color: #aabfd3;
}

.mt-account {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 38px clamp(4px, 1.8vw, 32px);
}

.mt-account-inner {
  width: 100%;
  max-width: 430px;
  margin: auto;
}

.mt-heading {
  text-align: center;
  margin-bottom: 35px;
}

.mt-form-icon {
  display: grid;
  place-items: center;
  width: 67px;
  height: 67px;
  margin: 0 auto 22px;
  border: 2px solid #63e6d2c7;
  border-radius: 19px;
  color: var(--mt-mint);
}

.mt-heading .mt-eyebrow {
  font-size: 10px;
  letter-spacing: 2.1px;
}

.mt-heading h2 {
  margin-top: 13px;
  font-size: clamp(33px, 3.05vw, 44px);
  font-weight: 680;
  letter-spacing: -1.6px;
  line-height: 1.15;
}

.mt-heading p {
  margin-top: 14px;
  color: var(--mt-muted);
  font-size: 15px;
  line-height: 1.7;
}

.mt-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.mt-label {
  display: block;
  margin-bottom: 10px;
  color: #edf3fa;
  font-size: 13px;
  font-weight: 600;
}

.mt-field {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 57px;
  padding: 0 16px;
  background: var(--mt-field);
  border: 1px solid var(--mt-border);
  border-radius: 12px;
  transition: border-color .2s, box-shadow .2s;
}

.mt-field > svg {
  flex-shrink: 0;
  color: #a3bbd3;
}

.mt-field:focus-within {
  border-color: var(--mt-mint);
  box-shadow: 0 0 0 3px #63e6d216;
}

.mt-login .mt-field input {
  width: 100%;
  min-width: 0;
  height: 55px;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #f5f8fc;
  font-size: 15px;
}

.mt-login .mt-field input:focus-visible {
  outline: none;
  box-shadow: none;
}

.mt-field input::placeholder {
  color: #8298af;
  opacity: 1;
}

.mt-field input:-webkit-autofill {
  -webkit-text-fill-color: #f5f8fc;
  caret-color: #f5f8fc;
  -webkit-box-shadow: 0 0 0 1000px var(--mt-field) inset;
}

.mt-eye {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 33px;
  height: 36px;
  margin-right: -7px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #a3bbd3;
}

.mt-eye:hover {
  color: var(--mt-mint);
}

.mt-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  color: #d9e5f0;
  font-size: 13px;
}

.mt-remember {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
}

.mt-remember input {
  width: 17px;
  height: 17px;
  margin: 0;
  accent-color: var(--mt-mint);
  cursor: pointer;
}

.mt-text-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--mt-mint);
  font-size: 13px;
  line-height: 1.6;
}

.mt-text-button:hover {
  color: #b4fff1;
}

.mt-primary, .mt-google {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 650;
  transition: background .2s, border-color .2s, box-shadow .2s;
}

.mt-primary {
  border: 1px solid #82f4e2;
  background: var(--mt-mint);
  color: #061a23;
  box-shadow: 0 6px 24px #63e6d20a;
}

.mt-primary:hover:not(:disabled) {
  background: #8bf2e2;
  box-shadow: 0 8px 28px #63e6d21f;
}

.mt-google {
  border: 1px solid #71869d;
  background: transparent;
  color: #edf3fa;
}

.mt-google:hover:not(:disabled) {
  border-color: #a6c4d6;
  background: #102133;
}

.mt-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 25px 0;
  color: #90a6be;
  font-size: 13px;
}

.mt-divider::before, .mt-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #35495f;
}

.mt-form-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 7px;
  margin-top: 32px !important;
  color: #99b0c6;
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

.mt-back {
  margin-bottom: 26px;
}

.mt-message {
  padding: 12px 14px;
  border: 1px solid;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.mt-error {
  color: #ffc3ce;
  border-color: #f18da638;
  background: #51233265;
}

.mt-notice {
  color: #b4f8df;
  border-color: #63e6d23a;
  background: #15453865;
}

.mt-config {
  margin-bottom: 23px !important;
}

.mt-messages:empty {
  display: none;
}

.mt-messages {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mt-caps {
  display: block;
  margin-top: 9px;
  color: #f8d594;
  font-size: 12px;
}

.mt-spin {
  animation: mt-spin 1s linear infinite;
}

@keyframes mt-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 1800px) {
  .mt-login {
    padding: 28px;
    gap: 70px;
  }
  .mt-story {
    min-height: calc(100svh - 56px);
  }
}

@media (max-width: 1100px) and (min-width: 901px) {
  .mt-login {
    grid-template-columns: minmax(0, 1.3fr) minmax(330px, 1fr);
    gap: 22px;
    padding: 16px;
  }
  .mt-story {
    min-height: calc(100svh - 32px);
    padding: 28px;
  }
  .mt-story h1 {
    font-size: 43px;
    letter-spacing: -1.9px;
  }
  .mt-slide-content {
    min-height: 260px;
  }
  .mt-brand strong {
    font-size: 18px;
  }
  .mt-brand-mark {
    width: 48px;
    height: 48px;
  }
}

@media (max-width: 900px) {
  .mt-login {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    padding: 16px;
  }
  .mt-story {
    min-height: 520px;
    padding: 32px;
  }
  .mt-story-body {
    padding-top: 125px;
  }
  .mt-story h1 {
    font-size: 52px;
    letter-spacing: -2px;
  }
  .mt-slide-content {
    min-height: 220px;
  }
  .mt-account {
    padding: 54px 20px 38px;
  }
  .mt-heading h2 {
    font-size: 39px;
  }
}

@media (max-width: 520px) {
  .mt-login {
    padding: 12px;
  }
  .mt-story {
    min-height: 490px;
    padding: 23px;
    border-radius: 21px;
  }
  .mt-brand {
    gap: 11px;
  }
  .mt-brand-mark {
    width: 43px;
    height: 43px;
    border-radius: 12px;
  }
  .mt-brand-mark svg {
    width: 25px;
  }
  .mt-brand strong {
    font-size: 16px;
    letter-spacing: -.4px;
  }
  .mt-story-body {
    padding-top: 90px;
  }
  .mt-story h1 {
    font-size: clamp(32px, 9.3vw, 42px);
    letter-spacing: -1.5px;
  }
  .mt-eyebrow {
    font-size: 9px;
    letter-spacing: 1.7px;
  }
  .mt-slide-content {
    min-height: 215px;
  }
  .mt-description {
    margin-top: 15px !important;
    font-size: 14px;
    line-height: 1.7;
  }
  .mt-story-footer {
    margin-top: 14px;
    gap: 18px;
  }
  .mt-feature {
    min-height: 34px;
    padding: 6px 10px;
    font-size: 10px;
  }
  .mt-feature svg {
    width: 14px;
    height: 14px;
  }
  .mt-account {
    padding: 44px 12px 25px;
  }
  .mt-heading {
    margin-bottom: 29px;
  }
  .mt-heading h2 {
    font-size: 36px;
  }
  .mt-heading p {
    font-size: 14px;
  }
  .mt-form-icon {
    width: 60px;
    height: 60px;
  }
  .mt-options {
    font-size: 12px;
  }
  .mt-text-button {
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mt-login *, .mt-login *::before, .mt-login *::after {
    animation: none !important;
    transition: none !important;
  }
}
`;

function HospitalStory() {
  const reduceMotion = useLoginReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const slide = hospitalSlides[index];
  const stopped = paused || hovered || focused || !!reduceMotion || !visible;
  useEffect(() => {
    const syncVisibility = () =>
      setVisible(document.visibilityState === "visible");
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () =>
      document.removeEventListener("visibilitychange", syncVisibility);
  }, []);
  useEffect(() => {
    if (stopped) return;
    const timer = window.setTimeout(() => {
      setDirection(1);
      setIndex((current) => (current + 1) % hospitalSlides.length);
    }, slideInterval);
    return () => window.clearTimeout(timer);
  }, [index, stopped]);
  function selectSlide(next: number) {
    const target = (next + hospitalSlides.length) % hospitalSlides.length;
    setDirection(next >= index ? 1 : -1);
    setPaused(true);
    setIndex(target);
  }
  return (
    <section
      className="mt-story"
      aria-label="Hospital workspace highlights"
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <img
        className="mt-story-photo"
        src={hospitalImage}
        alt=""
        fetchPriority="high"
      />
      <header className="mt-brand">
        <span className="mt-brand-mark">
          <Activity size={32} strokeWidth={2} aria-hidden="true" />
        </span>
        <strong>Hospital Management System</strong>
      </header>
      <div
        className="mt-story-body"
        aria-live={stopped ? "polite" : "off"}
        aria-atomic="true"
      >
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <motion.div
            key={index}
            className="mt-slide-content"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${hospitalSlides.length}`}
            custom={direction}
            variants={{
              enter: (side: number) => ({
                opacity: 0,
                x: reduceMotion ? 0 : side * 28,
              }),
              center: { opacity: 1, x: 0 },
              exit: (side: number) => ({
                opacity: 0,
                x: reduceMotion ? 0 : side * -24,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0 : 0.32, ease: "easeOut" }}
          >
            <span className="mt-eyebrow">{slide.label}</span>
            <h1>
              {slide.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p className="mt-description">{slide.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <footer className="mt-story-footer">
        <div className="mt-features">
          {slide.features.map(({ label, icon: Icon }) => (
            <span className="mt-feature" key={label}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
        <div className="mt-carousel-controls" aria-label="Slide controls">
          <button
            className="mt-icon-button"
            type="button"
            onClick={() => selectSlide(index - 1)}
            aria-label="Previous hospital slide"
          >
            <ChevronLeft size={19} />
          </button>
          <div className="mt-pagination">
            {hospitalSlides.map((item, position) => (
              <button
                className="mt-dot"
                type="button"
                key={item.label}
                aria-label={`Show slide ${position + 1}: ${item.label.toLowerCase()}`}
                aria-current={position === index ? "true" : undefined}
                onClick={() => selectSlide(position)}
              >
                <span />
              </button>
            ))}
          </div>
          <button
            className="mt-icon-button"
            type="button"
            onClick={() => selectSlide(index + 1)}
            aria-label="Next hospital slide"
          >
            <ChevronRight size={19} />
          </button>
          <button
            className="mt-icon-button mt-pause"
            type="button"
            aria-label={
              paused || reduceMotion
                ? "Play hospital slides"
                : "Pause hospital slides"
            }
            aria-pressed={paused || !!reduceMotion}
            disabled={!!reduceMotion}
            onClick={() => setPaused((current) => !current)}
          >
            {paused || reduceMotion ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
      </footer>
    </section>
  );
}

function LoginForm({ onLogin }: LoginPageProps) {
  const auth = useHospitalAuth();
  const reduceMotion = useLoginReducedMotion();
  const [view, setView] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState(readRememberedEmail);
  const [rememberEmail, setRememberEmail] = useState(
    () => !!readRememberedEmail(),
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const callbackUser = useRef("");
  const blocked = !auth.configured || !!auth.busy || auth.status === "loading";
  useEffect(() => {
    try {
      if (rememberEmail) localStorage.setItem(rememberedEmailKey, email);
      else localStorage.removeItem(rememberedEmailKey);
    } catch {
      /* Remembering an email is optional; sign-in still works. */
    }
  }, [email, rememberEmail]);
  useEffect(() => {
    if (!auth.user || auth.status !== "signed_in") {
      callbackUser.current = "";
      return;
    }
    if (onLogin && callbackUser.current !== auth.user.email) {
      callbackUser.current = auth.user.email;
      setPassword("");
      onLogin(auth.user);
    }
  }, [auth.user, auth.status, onLogin]);
  useEffect(() => {
    if (view === "login" && !window.matchMedia("(min-width: 901px)").matches)
      return;
    const timer = window.setTimeout(
      () => emailInput.current?.focus({ preventScroll: true }),
      reduceMotion ? 0 : 420,
    );
    return () => window.clearTimeout(timer);
  }, [view, reduceMotion]);
  function changeView(next: "login" | "forgot") {
    if (blocked) return;
    auth.clearMessages();
    setPassword("");
    setShowPassword(false);
    setCapsLock(false);
    setView(next);
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    if (view === "forgot") await auth.sendResetEmail(email);
    else if (await auth.signIn(email, password)) setPassword("");
  }
  return (
    <main className="mt-login">
      <style>{loginStyles}</style>
      <HospitalStory />
      <motion.section
        className="mt-account"
        aria-label="Hospital account access"
        initial={reduceMotion ? false : { opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
      >
        <div className="mt-account-inner">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={view}
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, x: view === "forgot" ? 16 : -16 }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={{
                opacity: 0,
                x: reduceMotion ? 0 : view === "forgot" ? 12 : -12,
              }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            >
              {view === "forgot" && (
                <button
                  className="mt-text-button mt-back"
                  type="button"
                  onClick={() => changeView("login")}
                  disabled={blocked}
                >
                  <ArrowLeft size={15} />
                  Back to sign in
                </button>
              )}
              <header className="mt-heading">
                <div className="mt-form-icon" aria-hidden="true">
                  {view === "forgot" ? (
                    <KeyRound size={33} strokeWidth={1.5} />
                  ) : (
                    <Stethoscope size={36} strokeWidth={1.5} />
                  )}
                </div>
                <span className="mt-eyebrow">
                  {view === "forgot"
                    ? "ACCOUNT RECOVERY"
                    : "HOSPITAL STAFF ACCESS"}
                </span>
                <h2>
                  {view === "forgot" ? "Reset your password" : "Welcome back"}
                </h2>
                <p>
                  {view === "forgot"
                    ? "Enter your email to receive a password reset link."
                    : "Sign in to manage your hospital."}
                </p>
              </header>
              {!auth.configured && (
                <p className="mt-message mt-error mt-config" role="alert">
                  Sign-in is unavailable until the hospital connection is
                  configured. Please contact your administrator.
                </p>
              )}
              <form
                className="mt-form"
                onSubmit={handleSubmit}
                aria-busy={!!auth.busy || auth.status === "loading"}
              >
                <div>
                  <label className="mt-label" htmlFor="mt-email">
                    Email address
                  </label>
                  <div className="mt-field">
                    <Mail size={19} aria-hidden="true" />
                    <input
                      ref={emailInput}
                      id="mt-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="you@hospital.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      disabled={blocked}
                    />
                  </div>
                </div>
                {view === "login" && (
                  <>
                    <div>
                      <label className="mt-label" htmlFor="mt-password">
                        Password
                      </label>
                      <div className="mt-field">
                        <LockKeyhole size={19} aria-hidden="true" />
                        <input
                          id="mt-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          onKeyUp={(event) =>
                            setCapsLock(event.getModifierState("CapsLock"))
                          }
                          onBlur={() => setCapsLock(false)}
                          aria-describedby={
                            capsLock ? "mt-caps-lock" : undefined
                          }
                          required
                          disabled={blocked}
                        />
                        <button
                          className="mt-eye"
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          disabled={blocked}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          aria-pressed={showPassword}
                        >
                          {showPassword ? (
                            <EyeOff size={19} />
                          ) : (
                            <Eye size={19} />
                          )}
                        </button>
                      </div>
                      {capsLock && (
                        <small className="mt-caps" id="mt-caps-lock">
                          Caps Lock is on.
                        </small>
                      )}
                    </div>
                    <div className="mt-options">
                      <label className="mt-remember">
                        <input
                          type="checkbox"
                          checked={rememberEmail}
                          onChange={(event) =>
                            setRememberEmail(event.target.checked)
                          }
                          disabled={blocked}
                        />
                        Remember email
                      </label>
                      <button
                        className="mt-text-button"
                        type="button"
                        onClick={() => changeView("forgot")}
                        disabled={blocked}
                      >
                        Forgot password?
                      </button>
                    </div>
                  </>
                )}
                <div
                  className="mt-messages"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {auth.error && (
                    <p className="mt-message mt-error" role="alert">
                      {auth.error}
                    </p>
                  )}
                  {auth.notice && (
                    <p className="mt-message mt-notice" role="status">
                      {auth.notice}
                    </p>
                  )}
                </div>
                <button className="mt-primary" type="submit" disabled={blocked}>
                  {auth.busy === "password" ||
                  auth.busy === "reset-email" ||
                  auth.status === "loading" ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="mt-spin"
                        aria-hidden="true"
                      />
                      <span>
                        {auth.status === "loading"
                          ? "Verifying access…"
                          : view === "forgot"
                            ? "Sending reset link…"
                            : "Signing you in…"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {view === "forgot" ? "Send reset link" : "Sign in"}
                      </span>
                      {view === "forgot" && (
                        <ArrowRight size={17} aria-hidden="true" />
                      )}
                    </>
                  )}
                </button>
              </form>
              {view === "login" && (
                <>
                  <div className="mt-divider">or</div>
                  <button
                    className="mt-google"
                    type="button"
                    onClick={() => void auth.signInWithGoogle()}
                    disabled={blocked}
                  >
                    {auth.busy === "google" ? (
                      <LoaderCircle
                        size={19}
                        className="mt-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <GoogleMark />
                    )}
                    <span>
                      {auth.busy === "google"
                        ? "Connecting to Google…"
                        : "Continue with Google"}
                    </span>
                  </button>
                </>
              )}
              <p className="mt-form-footer">
                <LockKeyhole size={13} aria-hidden="true" />
                Hospital staff portal
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>
    </main>
  );
}

// Supports both current import paths and the older optional onLogin prop.

export default function LoginPage(props: LoginPageProps) {
  const existingProvider = useOptionalHospitalAuth();
  return existingProvider ? (
    <LoginForm {...props} />
  ) : (
    <HospitalAuthProvider>
      <LoginForm {...props} />
    </HospitalAuthProvider>
  );
}
