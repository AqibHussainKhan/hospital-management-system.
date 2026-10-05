import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  gradient: string;
  trend?: string;
  trendType?: "up" | "down";
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  trend,
  trendType = "up",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="group relative overflow-hidden rounded-[22px] border border-white/[0.07] bg-slate-900/70 p-5 shadow-xl shadow-black/10 backdrop-blur-xl"
    >
      {/* background glow */}
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-3xl transition duration-500 group-hover:opacity-20`}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
          >
            {icon}
          </div>

          {trend && (
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                trendType === "up"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {trendType === "up" ? (
                <ArrowUpRight size={12} />
              ) : (
                <ArrowDownRight size={12} />
              )}

              {trend}
            </div>
          )}
        </div>

        <p className="mt-5 text-[11px] font-medium text-slate-500">
          {title}
        </p>

        <h3 className="mt-1 text-2xl font-bold tracking-tight text-white">
          {value}
        </h3>

        <p className="mt-2 text-[10px] text-slate-600">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}

export default StatCard;