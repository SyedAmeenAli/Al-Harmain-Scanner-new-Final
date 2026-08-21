import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/* Thin wrapper so bookExperience components import from one local place;
   defers to framer-motion's own matchMedia-backed hook (same mechanism the
   old experience/ module already relies on and has proven correct). */
export default function useReducedMotion() {
  return !!useFramerReducedMotion();
}
