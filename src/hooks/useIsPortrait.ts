import { useOrientationContext } from "@/providers/OrientationProvider";

export const useIsPortrait = () => {
  const { isPortrait } = useOrientationContext();
  return isPortrait;
};
//file
