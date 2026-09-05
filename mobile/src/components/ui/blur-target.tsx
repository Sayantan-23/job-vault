import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import type { View } from 'react-native';

const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function BlurTargetProvider({
  children,
  blurTarget,
}: {
  children: ReactNode;
  blurTarget: RefObject<View | null>;
}) {
  return (
    <BlurTargetContext.Provider value={blurTarget}>
      {children}
    </BlurTargetContext.Provider>
  );
}

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}
