import { useContext } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import {
  useEffect,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";

const slides = [
  {
    id: 1,

    eyebrow: "Smart Healthcare Management",

    title:
      "Delivering better healthcare through smarter hospital management.",

    description:
      "Monitor patients, doctors, appointments, beds and hospital operations from one secure dashboard.",

    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1800&q=85",

    icon: HeartPulse,

    accent: "Patient care and daily operations",
  },

  {
    id: 2,

    eyebrow: "Expert Medical Team",

    title:
      "Connect patients with the right doctors at the right time.",

    description:
      "Manage doctor schedules, departments and appointments while keeping daily clinical operations organized.",

    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1800&q=85",

    icon: ShieldCheck,

    accent: "View your hospital medical team",
  },

  {
    id: 3,

    eyebrow: "Connected Hospital",

    title:
      "Every department. One intelligent hospital system.",

    description:
      "From laboratory and pharmacy to wards, billing and operation theaters — keep everything connected.",

    image:
      "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1800&q=85",

    icon: CalendarCheck,

    accent: "Live hospital operations",
  },
];

function HeroCarousel() {
  const systemReduced = useReducedMotion(); const theme = useContext(ThemeContext);
  const reduced = systemReduced || theme?.preferences.reducedMotion;
  const [current, setCurrent] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

  useEffect(() => {
    if (paused || reduced) return;

    const interval = setInterval(() => {
      setCurrent((previous) =>
        previous === slides.length - 1
          ? 0
          : previous + 1
      );
    }, 5500);

    return () =>
      clearInterval(interval);
  }, [paused, reduced]);

  const nextSlide = () => {
    setCurrent((previous) =>
      previous === slides.length - 1
        ? 0
        : previous + 1
    );
  };

  const previousSlide = () => {
    setCurrent((previous) =>
      previous === 0
        ? slides.length - 1
        : previous - 1
    );
  };

  const slide = slides[current];

  const Icon = slide.icon;

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.2,
      }}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}
      onMouseEnter={() =>
        setPaused(true)
      }
      onMouseLeave={() =>
        setPaused(false)
      }
      className="
        relative
        min-h-[430px]
        overflow-hidden
        rounded-[30px]
        border border-white/[0.08]
        shadow-[0_30px_80px_rgba(0,0,0,0.24)]
        md:min-h-[480px]
      "
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{
            opacity: 0,
            scale: 1.03,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            scale: 1.02,
          }}
          transition={{
            duration: 0.2,
          }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt=""
            className="
              h-full w-full
              object-cover
            "
          />

          <div
            className="
              absolute inset-0
              bg-gradient-to-r
              from-[#04101d]/95
              via-[#07182a]/82
              to-[#07182a]/25
            "
          />

          <div
            className="
              absolute inset-0
              bg-gradient-to-t
              from-[#020817]/70
              via-transparent
              to-transparent
            "
          />
        </motion.div>
      </AnimatePresence>

      <div
        className="
          relative z-10
          flex min-h-[430px]
          flex-col justify-between
          p-6
          md:min-h-[480px]
          md:p-10
          lg:p-12
        "
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${slide.id}`}
            initial={{
              opacity: 0,
              x: -25,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: 20,
            }}
            transition={{
              duration: 0.2,
            }}
            className="
              max-w-[700px]
              pt-5
            "
          >
            <div
              className="
                mb-5
                inline-flex
                items-center gap-2
                rounded-full
                border border-blue-400/20
                bg-blue-500/10
                px-3 py-2
                backdrop-blur-xl
              "
            >
              <Icon
                size={14}
                className="text-blue-300"
              />

              <span
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-blue-200
                "
              >
                {slide.eyebrow}
              </span>
            </div>

            <h1
              className="
                max-w-[680px]
                text-[30px]
                font-semibold
                leading-[1.15]
                tracking-[-0.045em]
                text-white
                sm:text-[38px]
                lg:text-[46px]
              "
            >
              {slide.title}
            </h1>

            <p
              className="
                mt-5
                max-w-[590px]
                text-[12px]
                leading-6
                text-slate-300
                md:text-[13px]
              "
            >
              {slide.description}
            </p>

            <div
              className="
                mt-7
                flex flex-wrap
                items-center gap-3
              "
            >
              <button
                type="button"
                className="
                  rounded-[13px]
                  bg-blue-600
                  px-5 py-3
                  text-[10px]
                  font-semibold
                  text-white
                  shadow-[0_10px_25px_rgba(37,99,235,0.25)]
                  transition
                  hover:bg-blue-500
                "
              >
                View Hospital Overview
              </button>

              <div
                className="
                  flex items-center gap-2
                  rounded-[13px]
                  border border-white/10
                  bg-white/[0.06]
                  px-4 py-3
                  backdrop-blur-xl
                "
              >
                <span
                  className="
                    relative flex
                    h-2 w-2
                  "
                >
                  <span
                    className="
                      absolute
                      h-full w-full
                      animate-ping
                      rounded-full
                      bg-emerald-400
                      opacity-40
                    "
                  />

                  <span
                    className="
                      relative
                      h-2 w-2
                      rounded-full
                      bg-emerald-400
                    "
                  />
                </span>

                <span
                  className="
                    text-[9px]
                    font-medium
                    text-slate-200
                  "
                >
                  {slide.accent}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div
          className="
            flex
            items-center
            justify-between
            gap-5
          "
        >
          {/* Indicators */}

          <div className="flex items-center gap-2">
            {slides.map(
              (item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Open slide ${
                    index + 1
                  }`}
                  onClick={() =>
                    setCurrent(index)
                  }
                  className={`
                    h-[4px]
                    rounded-full
                    transition-all
                    duration-300

                    ${
                      current === index
                        ? "w-8 bg-blue-400"
                        : "w-3 bg-white/30 hover:bg-white/60"
                    }
                  `}
                />
              )
            )}
          </div>

          {/* Arrows */}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={previousSlide}
              aria-label="Previous slide"
              className="
                flex h-10 w-10
                items-center
                justify-center
                rounded-xl
                border border-white/10
                bg-white/[0.06]
                text-white
                backdrop-blur-xl
                transition
                hover:bg-white/[0.12]
              "
            >
              <ArrowLeft size={16} />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="
                flex h-10 w-10
                items-center
                justify-center
                rounded-xl
                border border-white/10
                bg-white/[0.06]
                text-white
                backdrop-blur-xl
                transition
                hover:bg-white/[0.12]
              "
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default HeroCarousel;