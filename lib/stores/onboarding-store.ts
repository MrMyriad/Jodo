import { create } from "zustand";

type OnboardingState = {
  step: 1 | 2 | 3;
  businessType: string | null;
  goal: string | null;
  connection: string | null;
  setStep: (step: 1 | 2 | 3) => void;
  setBusinessType: (value: string | null) => void;
  setGoal: (value: string | null) => void;
  setConnection: (value: string | null) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 1,
  businessType: null,
  goal: null,
  connection: null,
  setStep: (step) => set({ step }),
  setBusinessType: (businessType) => set({ businessType }),
  setGoal: (goal) => set({ goal }),
  setConnection: (connection) => set({ connection }),
  reset: () =>
    set({
      step: 1,
      businessType: null,
      goal: null,
      connection: null,
    }),
}));
