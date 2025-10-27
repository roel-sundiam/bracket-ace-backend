import { viewerTracker } from '../../utils/viewerTracker';

export const viewerResolvers = {
  Query: {
    /**
     * Get the current viewer count for a tournament
     */
    viewerCount: async (_: any, { tournamentId }: { tournamentId: string }) => {
      return viewerTracker.getViewerCount(tournamentId);
    },
  },

  Mutation: {
    /**
     * Track a viewer session
     */
    trackViewer: async (_: any, { tournamentId, sessionId }: { tournamentId: string; sessionId: string }) => {
      viewerTracker.trackViewer(sessionId, tournamentId);
      return true;
    },

    /**
     * Remove a viewer session
     */
    removeViewer: async (_: any, { tournamentId, sessionId }: { tournamentId: string; sessionId: string }) => {
      viewerTracker.removeViewer(sessionId, tournamentId);
      return true;
    },
  },
};
