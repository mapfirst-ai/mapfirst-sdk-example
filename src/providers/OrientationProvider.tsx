"use client";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type OrientationContextValue = {
  isPortrait: boolean;
};

const OrientationContext = createContext<OrientationContextValue | undefined>(
  undefined
);

const getIsPortrait = () => {
  if (typeof window === "undefined") {
    return true;
  }
  return window.innerHeight >= window.innerWidth;
};

export const OrientationProvider = ({
  children,
  initialIsPortrait,
}: {
  children: ReactNode;
  initialIsPortrait?: boolean;
}) => {
  const [isPortrait, setIsPortrait] = useState(() => initialIsPortrait ?? true);

  useEffect(() => {
    if (initialIsPortrait !== undefined) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    const updateOrientation = () => {
      setIsPortrait(getIsPortrait());
    };

    updateOrientation();

    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  const value = useMemo(
    () => ({
      isPortrait,
    }),
    [isPortrait]
  );

  return (
    <OrientationContext.Provider value={value}>
      {children}
    </OrientationContext.Provider>
  );
};

export const useOrientationContext = () => {
  const context = useContext(OrientationContext);
  if (!context) {
    throw new Error(
      "useOrientationContext must be used within an OrientationProvider"
    );
  }
  return context;
};
