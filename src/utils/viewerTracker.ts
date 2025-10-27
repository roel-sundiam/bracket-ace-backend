/**
 * Viewer Tracker Service
 * Tracks active viewers for live tournament pages using in-memory storage
 */

interface ViewerSession {
  sessionId: string;
  tournamentId: string;
  lastSeen: Date;
}

class ViewerTracker {
  private viewers: Map<string, ViewerSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_TIMEOUT = 30000; // 30 seconds
  private readonly CLEANUP_INTERVAL = 10000; // 10 seconds

  constructor() {
    this.startCleanupTask();
  }

  /**
   * Register or update a viewer session
   */
  trackViewer(sessionId: string, tournamentId: string): void {
    const key = `${tournamentId}:${sessionId}`;
    this.viewers.set(key, {
      sessionId,
      tournamentId,
      lastSeen: new Date()
    });
  }

  /**
   * Remove a viewer session
   */
  removeViewer(sessionId: string, tournamentId: string): void {
    const key = `${tournamentId}:${sessionId}`;
    this.viewers.delete(key);
  }

  /**
   * Get count of active viewers for a tournament
   */
  getViewerCount(tournamentId: string): number {
    let count = 0;
    const now = new Date();

    this.viewers.forEach((session) => {
      if (session.tournamentId === tournamentId) {
        const timeSinceLastSeen = now.getTime() - session.lastSeen.getTime();
        if (timeSinceLastSeen < this.SESSION_TIMEOUT) {
          count++;
        }
      }
    });

    return count;
  }

  /**
   * Clean up stale sessions
   */
  private cleanup(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    this.viewers.forEach((session, key) => {
      const timeSinceLastSeen = now.getTime() - session.lastSeen.getTime();
      if (timeSinceLastSeen >= this.SESSION_TIMEOUT) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.viewers.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} stale viewer sessions`);
    }
  }

  /**
   * Start periodic cleanup task
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup task (for graceful shutdown)
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get all active sessions for debugging
   */
  getActiveSessions(): ViewerSession[] {
    const now = new Date();
    const activeSessions: ViewerSession[] = [];

    this.viewers.forEach((session) => {
      const timeSinceLastSeen = now.getTime() - session.lastSeen.getTime();
      if (timeSinceLastSeen < this.SESSION_TIMEOUT) {
        activeSessions.push(session);
      }
    });

    return activeSessions;
  }
}

// Export singleton instance
export const viewerTracker = new ViewerTracker();
