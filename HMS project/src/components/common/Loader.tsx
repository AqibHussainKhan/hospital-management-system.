import { motion } from "framer-motion";
import { Activity } from "lucide-react";

interface LoaderProps {
  text?: string;

  size?: "sm" | "md" | "lg";

  fullScreen?: boolean;
}

function Loader({
  text = "Loading...",
  size = "md",
  fullScreen = false,
}: LoaderProps) {
  const spinnerSize = {
    sm: "h-6 w-6",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div
          className={`
            rounded-full
            border-2
            border-white/[0.08]
            border-t-blue-500
            animate-spin

            ${spinnerSize[size]}
          `}
        />

        {size === "lg" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity
              size={14}
              className="text-blue-400"
            />
          </div>
        )}
      </div>

      {text && (
        <motion.p
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="text-[10px] font-medium tracking-wide text-slate-500"
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#06111f]">
        {content}
      </div>
    );
  }

  return content;
}

export default Loader;