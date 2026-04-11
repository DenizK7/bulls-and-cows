"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { BrandTitle } from "@/components/BrandTitle";

const DEMO_GUESSES = [
  { guess: "1234", bulls: 0, cows: 2, delay: 0 },
  { guess: "5678", bulls: 1, cows: 1, delay: 0.15 },
  { guess: "5291", bulls: 2, cows: 1, delay: 0.3 },
  { guess: "5271", bulls: 4, cows: 0, delay: 0.45 },
];

function DigitCard({
  digit,
  type,
  delay,
}: {
  digit: string;
  type: "bull" | "cow" | "miss";
  delay: number;
}) {
  const bg =
    type === "bull"
      ? "bg-bull/20 border-bull text-bull"
      : type === "cow"
        ? "bg-cow/20 border-cow text-cow"
        : "bg-bg-elevated border-border text-text-muted";

  return (
    <motion.div
      initial={{ rotateX: 90, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={`w-10 h-12 rounded-lg border-2 ${bg} flex items-center justify-center font-mono text-xl font-bold`}
    >
      {digit}
    </motion.div>
  );
}

function DemoRow({
  guess,
  bulls,
  cows,
  delay,
}: {
  guess: string;
  bulls: number;
  cows: number;
  delay: number;
}) {
  const secret = "5271";
  const types = guess.split("").map((d, i) => {
    if (d === secret[i]) return "bull" as const;
    if (secret.includes(d)) return "cow" as const;
    return "miss" as const;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-2 sm:gap-3"
    >
      <div className="flex gap-1.5">
        {guess.split("").map((digit, i) => (
          <DigitCard
            key={i}
            digit={digit}
            type={types[i]}
            delay={delay + 0.1 * i}
          />
        ))}
      </div>
      <div className="flex gap-2 ml-3 min-w-[80px]">
        {bulls > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.5, type: "spring" }}
            className="text-bull font-mono font-bold text-lg"
          >
            {bulls}B
          </motion.span>
        )}
        {cows > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.6, type: "spring" }}
            className="text-cow font-mono font-bold text-lg"
          >
            {cows}C
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { t } = useT();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[10%] w-72 h-72 bg-bull/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-cow/5 rounded-full blur-[120px]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full">
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="mb-4">
            <BrandTitle size="lg" animate />
          </div>
          <p className="text-text-muted text-lg">
            {t("landing.title.crack")} {t("landing.title.challenge")}
          </p>
        </motion.div>

        {/* Demo Game Board */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-4 sm:p-5 w-full"
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-text-muted text-sm font-medium uppercase tracking-wider">
              Demo Round
            </span>
            <span className="text-text-dim text-sm font-mono">
              Secret: ????
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {DEMO_GUESSES.map((g) => (
              <DemoRow key={g.guess} {...g} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="mt-5 pt-4 border-t border-border flex items-center justify-between"
          >
            <span className="text-success font-medium">
              Cracked in 4 guesses!
            </span>
            <span className="font-mono text-text-muted text-sm">
              Secret was{" "}
              <span className="text-accent font-bold">5271</span>
            </span>
          </motion.div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="w-full"
        >
          <Link href="/login" className="block">
            <button className="w-full px-8 py-4 bg-accent text-bg font-semibold text-lg rounded-xl hover:brightness-110 transition-all duration-200 cursor-pointer active:scale-[0.98]">
              {t("landing.playNow")}
            </button>
          </Link>
        </motion.div>

        {/* Stats teaser */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex gap-6 text-center"
        >
          <div>
            <div className="text-2xl font-bold text-text font-mono">1v1</div>
            <div className="text-text-dim text-sm">{t("landing.realTime")}</div>
          </div>
          <div className="w-px bg-border" />
          <div>
            <div className="text-2xl font-bold text-text font-mono">AI</div>
            <div className="text-text-dim text-sm">{t("landing.difficulties")}</div>
          </div>
          <div className="w-px bg-border" />
          <div>
            <div className="text-2xl font-bold text-text font-mono">ELO</div>
            <div className="text-text-dim text-sm">{t("landing.ranked")}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
