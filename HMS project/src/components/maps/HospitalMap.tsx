import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

import {
  Building2,
  Clock3,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

/* =====================================================
   HOSPITAL LOCATION

   IMPORTANT:
   Ye filhal example location hai.
   Baad mein apne actual hospital ki latitude
   aur longitude yahan replace kar dena.
===================================================== */

const hospitalLocation: [number, number] = [
  29.3956,
  71.6836,
];

/* =====================================================
   CUSTOM HOSPITAL MARKER
===================================================== */

const hospitalIcon = L.divIcon({
  className: "",
  html: `
    <div
      style="
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        background: linear-gradient(
          135deg,
          #2563eb,
          #3b82f6
        );
        border: 3px solid white;
        box-shadow:
          0 12px 30px rgba(37, 99, 235, 0.35);
        color: white;
        font-size: 20px;
      "
    >
      +
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -46],
});

function HospitalMap() {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${hospitalLocation[0]},${hospitalLocation[1]}`;

  return (
    <section className="hms-card overflow-hidden rounded-[28px]">
      {/* ================= HEADER ================= */}

      <div className="flex flex-col justify-between gap-5 border-b border-[var(--hms-border)] px-6 py-6 md:flex-row md:items-center md:px-7">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <MapPin
              size={14}
              className="text-blue-500"
            />

            <span className="text-[9px] font-bold uppercase tracking-[0.17em] text-blue-500">
              Hospital Location
            </span>
          </div>

          <h2 className="text-[18px] font-semibold tracking-tight text-[var(--hms-text)]">
            Find MediCore Hospital
          </h2>

          <p className="mt-1.5 text-[10px] text-[var(--hms-text-muted)]">
            View hospital location and get
            directions instantly.
          </p>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="
            inline-flex h-11
            items-center justify-center
            gap-2 self-start
            rounded-[13px]
            bg-blue-600
            px-4
            text-[10px]
            font-semibold
            text-white
            shadow-[0_10px_25px_rgba(37,99,235,0.18)]
            transition-all
            hover:bg-blue-500
            active:scale-[0.98]
            md:self-auto
          "
        >
          <Navigation size={14} />

          Get Directions
        </a>
      </div>

      {/* ================= CONTENT ================= */}

      <div className="grid lg:grid-cols-[1.5fr_0.7fr]">
        {/* ================= MAP ================= */}

        <div className="relative min-h-[390px] overflow-hidden">
          <MapContainer
            center={hospitalLocation}
            zoom={14}
            scrollWheelZoom={false}
            className="h-[390px] w-full md:h-[430px]"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker
              position={hospitalLocation}
              icon={hospitalIcon}
            >
              <Popup>
                <div
                  style={{
                    minWidth: "170px",
                  }}
                >
                  <strong>
                    MediCore Hospital
                  </strong>

                  <br />

                  Hospital Management System

                  <br />

                  <span
                    style={{
                      fontSize: "11px",
                    }}
                  >
                    Open 24 / 7
                  </span>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Live badge */}

          <div className="pointer-events-none absolute left-5 top-5 z-[500]">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/75 px-3 py-2 backdrop-blur-xl">
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />

                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>

              <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white">
                Hospital Open
              </span>
            </div>
          </div>
        </div>

        {/* ================= DETAILS ================= */}

        <div className="flex flex-col justify-between border-t border-[var(--hms-border)] p-6 lg:border-l lg:border-t-0 lg:p-7">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--hms-text-muted)]">
              Location Details
            </p>

            {/* Hospital */}

            <div className="mt-6 flex gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/[0.09] text-blue-500">
                <Building2 size={17} />
              </div>

              <div>
                <p className="text-[10px] text-[var(--hms-text-muted)]">
                  Hospital
                </p>

                <p className="mt-1 text-[12px] font-semibold text-[var(--hms-text)]">
                  MediCore Hospital
                </p>
              </div>
            </div>

            {/* Address */}

            <div className="mt-5 flex gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/[0.09] text-blue-500">
                <MapPin size={17} />
              </div>

              <div>
                <p className="text-[10px] text-[var(--hms-text-muted)]">
                  Address
                </p>

                <p className="mt-1 max-w-[220px] text-[11px] font-medium leading-5 text-[var(--hms-text-secondary)]">
                  Bahawalpur, Punjab,
                  Pakistan
                </p>
              </div>
            </div>

            {/* Emergency */}

            <div className="mt-5 flex gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/[0.09] text-emerald-500">
                <Clock3 size={17} />
              </div>

              <div>
                <p className="text-[10px] text-[var(--hms-text-muted)]">
                  Emergency
                </p>

                <p className="mt-1 text-[11px] font-medium text-[var(--hms-text-secondary)]">
                  Available 24 / 7
                </p>
              </div>
            </div>

            {/* Phone */}

            <div className="mt-5 flex gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/[0.09] text-cyan-500">
                <Phone size={17} />
              </div>

              <div>
                <p className="text-[10px] text-[var(--hms-text-muted)]">
                  Contact
                </p>

                <p className="mt-1 text-[11px] font-medium text-[var(--hms-text-secondary)]">
                  +92 308 7481640
                </p>
              </div>
            </div>
          </div>

          {/* Bottom button */}

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="
              mt-7
              flex h-11 w-full
              items-center justify-center
              gap-2
              rounded-[13px]
              border
              border-[var(--hms-border)]
              bg-[var(--hms-surface-secondary)]
              text-[10px]
              font-semibold
              text-[var(--hms-text-secondary)]
              transition-all
              hover:border-blue-500/20
              hover:text-blue-500
            "
          >
            <Navigation size={14} />

            Open in Maps
          </a>
        </div>
      </div>
    </section>
  );
}

export default HospitalMap;