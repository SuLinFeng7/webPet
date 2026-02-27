import { StorageState } from "@shared/storage";

export type PetRuntime = {
  root: HTMLDivElement;
  wrapper: HTMLDivElement;
  cleanup: () => void;
  updateState: (st: StorageState) => void;
};
