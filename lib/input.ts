"use client";

import { useEffect, useState } from "react";

/** True when the main pointer is a finger (phones and tablets), not a mouse or trackpad. */
export function touchPrimary() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

export function useTouchPrimary() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setTouch(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return touch;
}
