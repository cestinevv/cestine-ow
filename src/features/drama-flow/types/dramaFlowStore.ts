import type {
  DramaFlowDocument,
  DramaFlowEpisode,
  DramaFlowRole,
} from './dramaFlowDocument';

export type DramaFlowStep = 1 | 2 | 3;

export type DramaFlowStoreState = {
  document: DramaFlowDocument;
  flowStep: DramaFlowStep;
  hasHydrated: boolean;
  isSubmitting: boolean;
  submitError: string | null;

  patchDocument: (partial: Partial<DramaFlowDocument>) => void;
  replaceEpisodes: (episodes: DramaFlowEpisode[]) => void;
  replaceRoles: (roles: DramaFlowRole[]) => void;
  setFlowStep: (step: DramaFlowStep) => void;
  resetAll: () => void;
  setSubmitting: (value: boolean) => void;
  setSubmitError: (value: string | null) => void;
};
