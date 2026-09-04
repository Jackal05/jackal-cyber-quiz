import { MATCHMAKING_EXPANSION } from "../config.js";

class MatchmakingQueue {
  constructor() {
    this.queue = []; // [ { userId, username, rating, profile, mode, socketId, joinedAt } ]
    this.checkInterval = null;
    this.onMatchFound = null;
    this.onQueueStatus = null;
  }

  start({ onMatchFound, onQueueStatus }) {
    this.onMatchFound = onMatchFound;
    this.onQueueStatus = onQueueStatus;

    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        this.processQueue();
      }, 1000);
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getSearchRadius(elapsedSeconds) {
    for (const tier of MATCHMAKING_EXPANSION) {
      if (elapsedSeconds <= tier.maxSeconds) {
        return tier.radius;
      }
    }
    return 1000;
  }

  enqueue(player) {
    // Remove if already in queue
    this.dequeue(player.userId);

    const entry = {
      userId: player.userId,
      username: player.username,
      rating: player.rating,
      profile: player.profile,
      mode: player.mode || "general",
      socketId: player.socketId,
      joinedAt: Date.now(),
    };

    this.queue.push(entry);
    this.processQueue();
    return entry;
  }

  dequeue(userId) {
    const idx = this.queue.findIndex((p) => p.userId === userId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      return true;
    }
    return false;
  }

  isQueued(userId) {
    return this.queue.some((p) => p.userId === userId);
  }

  getQueueSize() {
    return this.queue.length;
  }

  processQueue() {
    if (this.queue.length < 2) {
      // Send queue status to waiting player
      if (this.queue.length === 1 && this.onQueueStatus) {
        const player = this.queue[0];
        const elapsedSec = Math.floor((Date.now() - player.joinedAt) / 1000);
        const radius = this.getSearchRadius(elapsedSec);
        this.onQueueStatus(player.userId, {
          elapsedSec,
          radius,
          minRating: Math.max(0, player.rating - radius),
          maxRating: player.rating + radius,
        });
      }
      return;
    }

    const matchedIndices = new Set();
    const now = Date.now();

    for (let i = 0; i < this.queue.length; i++) {
      if (matchedIndices.has(i)) continue;
      const p1 = this.queue[i];
      const p1Elapsed = Math.floor((now - p1.joinedAt) / 1000);
      const p1Radius = this.getSearchRadius(p1Elapsed);

      let bestMatchIdx = -1;
      let closestRatingDiff = Infinity;

      for (let j = i + 1; j < this.queue.length; j++) {
        if (matchedIndices.has(j)) continue;
        const p2 = this.queue[j];

        // Same mode check
        if (p1.mode !== p2.mode) continue;

        const p2Elapsed = Math.floor((now - p2.joinedAt) / 1000);
        const p2Radius = this.getSearchRadius(p2Elapsed);
        const maxAllowedRadius = Math.max(p1Radius, p2Radius);

        const diff = Math.abs(p1.rating - p2.rating);

        if (diff <= maxAllowedRadius && diff < closestRatingDiff) {
          closestRatingDiff = diff;
          bestMatchIdx = j;
        }
      }

      if (bestMatchIdx !== -1) {
        matchedIndices.add(i);
        matchedIndices.add(bestMatchIdx);

        const player1 = this.queue[i];
        const player2 = this.queue[bestMatchIdx];

        if (this.onMatchFound) {
          this.onMatchFound(player1, player2);
        }
      } else if (this.onQueueStatus) {
        this.onQueueStatus(p1.userId, {
          elapsedSec: p1Elapsed,
          radius: p1Radius,
          minRating: Math.max(0, p1.rating - p1Radius),
          maxRating: p1.rating + p1Radius,
        });
      }
    }

    // Remove matched players from queue atomically
    if (matchedIndices.size > 0) {
      this.queue = this.queue.filter((_, idx) => !matchedIndices.has(idx));
    }
  }
}

export const queueManager = new MatchmakingQueue();
