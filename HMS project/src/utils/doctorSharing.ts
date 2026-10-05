export interface DoctorShareData { name: string; specialty: string; department?: string; experience?: string; photo?: string; }
export function cleanDoctor(value: unknown): DoctorShareData | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (typeof source.name !== "string" || !source.name.trim() || typeof source.specialty !== "string" || !source.specialty.trim()) return null;
  const text = (key: string, max: number) => typeof source[key] === "string" ? (source[key] as string).slice(0, max) : undefined;
  let photo = text("photo", 1000);
  if (photo) { try { const url = new URL(photo); if (!['https:', 'http:'].includes(url.protocol)) photo = undefined; } catch { photo = undefined; } }
  return { name: source.name.trim().slice(0, 120), specialty: source.specialty.trim().slice(0, 120), department: text("department", 100), experience: text("experience", 100), photo };
}
export function doctorShareUrl(doctor: DoctorShareData) {
  const safe = cleanDoctor(doctor); if (!safe) throw new Error("Doctor name and specialty are required.");
  // Root URL works with BrowserRouter and avoids an extra server route.
  const url = new URL(import.meta.env.BASE_URL || "/", window.location.origin);
  url.hash = "doctor-card=" + encodeURIComponent(JSON.stringify(safe));
  return url.toString();
}
export function doctorFromHash(hash: string): DoctorShareData | null {
  const prefix = "#doctor-card="; if (!hash.startsWith(prefix) || hash.length > 12000) return null;
  try { return cleanDoctor(JSON.parse(decodeURIComponent(hash.slice(prefix.length)))); } catch { return null; }
}
export function doctorShareText(doctor: DoctorShareData) { return [doctor.name, doctor.specialty, doctor.department, doctor.experience, "MediCore · Doctor Profile"].filter(Boolean).join("\n"); }
