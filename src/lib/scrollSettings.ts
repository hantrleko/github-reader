const KEY = "ef:smooth-scroll";

export const getSmoothScrollEnabled = () => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
