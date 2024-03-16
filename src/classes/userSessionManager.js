export default class UserSessionManager {
  #userSessions = new Map();

  set(id, session) {
    this.#userSessions.set(id, session);
  }

  getById(id) {
    return this.#userSessions.get(id);
  }

  getByUserId(userId) {
    for (const [id, userSession] of this.#userSessions) {
      if (userSession.userId === userId) {
        return userSession;
      }
    }

    return null;
  }
}
