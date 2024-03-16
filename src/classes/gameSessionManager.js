export default class GameSessionManager {
  #gameSessions = new Map();

  set(id, session) {
    this.#gameSessions.set(id, session);
  }

  getById(id) {
    return this.#gameSessions.get(id) || null;
  }

  getByUserId(userId) {
    for (const [id, gameSession] of this.#gameSessions) {
      const userIsParticipant = gameSession.players.some(
        (player) => player.userId === userId
      );

      if (userIsParticipant) {
        return gameSession;
      }
    }

    return null;
  }

  delete(id) {
    if (!this.getById(id)) {
      throw new Error(`game session with id ${id} does not exist`);
    }

    this.#gameSessions.delete(id);
  }
}
