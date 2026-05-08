"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type {
  AppState,
  DailyTaskTemplateCreateInput,
  DailyTaskTemplateUpdateInput,
  TaskCreateInput,
  TaskUpdateInput,
  UserSettings,
} from "@/types/domain";
import {
  addDailyTaskTemplate as persistAddDailyTaskTemplate,
  addDevGems as persistAddDevGems,
  addSpendingRecord as persistAddSpendingRecord,
  APP_STATE_STORAGE_KEY,
  archiveTask as persistArchiveTask,
  EMPTY_APP_STATE,
  addTask as persistAddTask,
  redeemDustReward as persistRedeemDustReward,
  completeTask as persistCompleteTask,
  deleteDailyTaskTemplate as persistDeleteDailyTaskTemplate,
  deleteTask as persistDeleteTask,
  ensureAppStateReady,
  loadAppState,
  resetAppState as persistResetAppState,
  restoreTask as persistRestoreTask,
  saveAppState,
  setForceWeekendOpen as persistSetForceWeekendOpen,
  performTenPull as persistPerformTenPull,
  singleGachaPullWithPity as persistSingleGachaPull,
  toggleDailyTaskTemplate as persistToggleDailyTaskTemplate,
  updateDailyTaskTemplate as persistUpdateDailyTaskTemplate,
  updateTask as persistUpdateTask,
  updateUserSettings as persistUpdateUserSettings,
} from "@/lib/storage";

type UserSettingsFormInput = Pick<
  UserSettings,
  | "monthlyBudgetLimit"
  | "gachaCost"
  | "gachaOpenDays"
  | "taskRewardSettings"
  | "gachaRewardTiers"
  | "showDevTools"
  | "enablePity"
  | "srPityThreshold"
  | "urPityThreshold"
  | "seriesWeeklyTarget"
  | "seriesWeeklyBonusMultiplier"
>;

type AppStateContextValue = {
  appState: AppState;
  isHydrated: boolean;
  addTask: (input: TaskCreateInput) => AppState;
  addDailyTaskTemplate: (input: DailyTaskTemplateCreateInput) => AppState;
  updateDailyTaskTemplate: (
    templateId: string,
    input: DailyTaskTemplateUpdateInput,
  ) => AppState;
  toggleDailyTaskTemplate: (templateId: string) => AppState;
  deleteDailyTaskTemplate: (templateId: string) => AppState;
  updateTask: (taskId: string, input: TaskUpdateInput) => AppState;
  archiveTask: (taskId: string) => AppState;
  restoreTask: (taskId: string) => AppState;
  deleteTask: (taskId: string) => AppState;
  completeTask: (taskId: string) => AppState;
  addSpendingRecord: (amount: number, note: string, category?: string) => AppState;
  redeemDustReward: (rewardId: string) => AppState;
  singleGachaPull: () => AppState;
  performTenPull: () => AppState;
  addDevGems: (amount?: number) => AppState;
  updateUserSettings: (input: UserSettingsFormInput) => AppState;
  setForceWeekendOpen: (forceWeekendOpen: boolean) => void;
  resetAppState: () => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider(props: { children: React.ReactNode }) {
  const [appState, setAppState] = useState<AppState>(EMPTY_APP_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadedState = ensureAppStateReady(loadAppState());
    saveAppState(loadedState);
    setAppState(loadedState);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === APP_STATE_STORAGE_KEY) {
        setAppState(ensureAppStateReady(loadAppState()));
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value: AppStateContextValue = {
    appState,
    isHydrated,
    addTask(input) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistAddTask(input, currentState);
        return nextState;
      });
      return nextState;
    },
    addDailyTaskTemplate(input) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistAddDailyTaskTemplate(input, currentState);
        return nextState;
      });
      return nextState;
    },
    updateDailyTaskTemplate(templateId, input) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistUpdateDailyTaskTemplate(templateId, input, currentState);
        return nextState;
      });
      return nextState;
    },
    toggleDailyTaskTemplate(templateId) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistToggleDailyTaskTemplate(templateId, currentState);
        return nextState;
      });
      return nextState;
    },
    deleteDailyTaskTemplate(templateId) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistDeleteDailyTaskTemplate(templateId, currentState);
        return nextState;
      });
      return nextState;
    },
    updateTask(taskId, input) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistUpdateTask(taskId, input, currentState);
        return nextState;
      });
      return nextState;
    },
    archiveTask(taskId) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistArchiveTask(taskId, currentState);
        return nextState;
      });
      return nextState;
    },
    restoreTask(taskId) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistRestoreTask(taskId, currentState);
        return nextState;
      });
      return nextState;
    },
    deleteTask(taskId) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistDeleteTask(taskId, currentState);
        return nextState;
      });
      return nextState;
    },
    completeTask(taskId) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistCompleteTask(taskId, currentState);
        return nextState;
      });
      return nextState;
    },
    addSpendingRecord(amount, note, category) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistAddSpendingRecord(amount, note, category, currentState);
        return nextState;
      });
      return nextState;
    },
    redeemDustReward(rewardId) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistRedeemDustReward(rewardId, currentState);
        return nextState;
      });
      return nextState;
    },
    singleGachaPull() {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistSingleGachaPull(currentState);
        return nextState;
      });
      return nextState;
    },
    performTenPull() {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistPerformTenPull(currentState);
        return nextState;
      });
      return nextState;
    },
    addDevGems(amount) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistAddDevGems(amount ?? 500, currentState);
        return nextState;
      });
      return nextState;
    },
    updateUserSettings(input) {
      let nextState = appState;
      setAppState((currentState) => {
        nextState = persistUpdateUserSettings(input, currentState);
        return nextState;
      });
      return nextState;
    },
    setForceWeekendOpen(forceWeekendOpen) {
      setAppState((currentState) =>
        persistSetForceWeekendOpen(forceWeekendOpen, currentState),
      );
    },
    resetAppState() {
      setAppState(persistResetAppState());
    },
  };

  return <AppStateContext.Provider value={value}>{props.children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }

  return context;
}
