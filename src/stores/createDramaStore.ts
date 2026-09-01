import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createEmptyDramaFlowDocument,
  type DramaFlowDocument,
} from '@/features/drama-flow/types/dramaFlowDocument';
import type { DramaFlowStoreState } from '@/features/drama-flow/types/dramaFlowStore';
import {
  revokeAllEpisodePosterUrls,
  sanitizeEpisodesForHydrate,
  sanitizeEpisodesForPersist,
} from '@/features/drama-flow/utils/dramaFlowEpisodeUtils';

function mergeDocumentPatch(
  prev: DramaFlowDocument,
  partial: Partial<DramaFlowDocument>,
): DramaFlowDocument {
  return {
    ...prev,
    ...partial,
    episodes: 'episodes' in partial ? partial.episodes : prev.episodes,
    roles: 'roles' in partial ? partial.roles : prev.roles,
    tagIds: 'tagIds' in partial ? partial.tagIds : prev.tagIds,
  };
}

export type CreateDramaStoreState = DramaFlowStoreState & {
  drafts: Record<string, DramaFlowDocument>;
  currentUserId: string;
  /** 仅内存：清空草稿时递增，供 CreateView 强制 remount 各步骤表单。 */
  draftEpoch: number;

  switchUser: (userId: string) => void;
};

export const useCreateDramaStore = create<CreateDramaStoreState>()(
  persist(
    (set) => ({
      drafts: {
        guest: createEmptyDramaFlowDocument(),
      },
      currentUserId: 'guest',
      document: createEmptyDramaFlowDocument(),
      draftEpoch: 0,
      flowStep: 1,
      hasHydrated: false,
      isSubmitting: false,
      submitError: null,

      switchUser: (userId) => {
        set((s) => {
          if (s.currentUserId === userId) return {};

          const currentDrafts = s.drafts;
          const userDraft =
            currentDrafts[userId] || createEmptyDramaFlowDocument();

          return {
            currentUserId: userId,
            drafts: {
              ...currentDrafts,
              [userId]: userDraft,
            },
            document: userDraft,
            flowStep: 1,
            submitError: null,
            draftEpoch: s.draftEpoch + 1,
          };
        });
      },

      patchDocument: (partial) => {
        set((s) => {
          const newDoc = mergeDocumentPatch(s.document, partial);
          return {
            document: newDoc,
            drafts: {
              ...s.drafts,
              [s.currentUserId]: newDoc,
            },
          };
        });
      },

      replaceEpisodes: (episodes) => {
        set((s) => {
          const newDoc = mergeDocumentPatch(s.document, { episodes });
          return {
            document: newDoc,
            drafts: {
              ...s.drafts,
              [s.currentUserId]: newDoc,
            },
          };
        });
      },

      replaceRoles: (roles) => {
        set((s) => {
          const newDoc = mergeDocumentPatch(s.document, { roles });
          return {
            document: newDoc,
            drafts: {
              ...s.drafts,
              [s.currentUserId]: newDoc,
            },
          };
        });
      },

      setFlowStep: (step) => {
        set({ flowStep: step });
      },

      resetAll: () => {
        set((s) => {
          revokeAllEpisodePosterUrls(s.document.episodes);
          const newDoc = createEmptyDramaFlowDocument();
          return {
            document: newDoc,
            drafts: {
              ...s.drafts,
              [s.currentUserId]: newDoc,
            },
            draftEpoch: s.draftEpoch + 1,
            flowStep: 1,
            isSubmitting: false,
            submitError: null,
          };
        });
      },

      setSubmitting: (value) => {
        set({ isSubmitting: value });
      },

      setSubmitError: (value) => {
        set({ submitError: value });
      },
    }),
    {
      name: 'create-drama-store',
      partialize: (state) => ({
        drafts: Object.fromEntries(
          Object.entries(state.drafts).map(([key, draft]) => [
            key,
            {
              ...draft,
              episodes: sanitizeEpisodesForPersist(draft.episodes),
            },
          ]),
        ),
        currentUserId: state.currentUserId,
      }),
      merge: (persistedState: unknown, currentState: CreateDramaStoreState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }

        const stateObj = persistedState as Record<string, unknown>;
        const drafts = stateObj.drafts as
          | Record<string, DramaFlowDocument>
          | undefined;
        const currentUserId = stateObj.currentUserId as string | undefined;

        if (!drafts || typeof drafts !== 'object' || !currentUserId) {
          return currentState;
        }

        // 保证水合期间各账号草稿中的 episodes 结构符合要求
        const hydratedDrafts: Record<string, DramaFlowDocument> = {};
        for (const key of Object.keys(drafts)) {
          const draft = drafts[key];
          if (draft) {
            hydratedDrafts[key] = {
              ...draft,
              episodes: sanitizeEpisodesForHydrate(draft.episodes),
            };
          }
        }

        const activeDoc =
          hydratedDrafts[currentUserId] || createEmptyDramaFlowDocument();
        hydratedDrafts[currentUserId] = activeDoc;

        return {
          ...currentState,
          drafts: hydratedDrafts,
          currentUserId,
          document: activeDoc,
        };
      },
      onRehydrateStorage: () => (_state, _error) => {
        useCreateDramaStore.setState({ hasHydrated: true });
      },
    },
  ),
);
