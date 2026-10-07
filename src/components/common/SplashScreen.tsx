import { motion } from "framer-motion";
import logoMark from "@/assets/alphaminds-logo.png";

export function SplashScreen() {
  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.7, ease: "easeInOut" } }}
      aria-hidden="true"
    >
      <div className="splash-glow splash-glow-1" />
      <div className="splash-glow splash-glow-2" />
      <div className="splash-glow splash-glow-3" />
      <div className="splash-sheen" />
      <div className="splash-grain" />

      <div className="splash-logo-wrap">
        <div className="splash-logo-halo" />
        <div className="splash-brand">
          <img src={logoMark} alt="" width="110" height="110" />
          <span>AlphaMinds</span>
        </div>
      </div>
    </motion.div>
  );
}