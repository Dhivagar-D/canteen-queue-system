/**
 * Session Service
 * Handles session-wise menu management: Morning (Breakfast), Lunch, Dining (Dinner).
 * Supports dynamic time-based detection and manual override.
 */

// Default session time windows (in 24-hour format "HH:MM")
export const defaultSessions = {
  MORNING: {
    id: 'MORNING',
    label: 'Morning Breakfast',
    icon: 'Coffee',
    startTime: '07:00',
    endTime: '11:30',
    description: 'Fresh breakfast, dosas, idlis, and hot beverages'
  },
  LUNCH: {
    id: 'LUNCH',
    label: 'Afternoon Lunch',
    icon: 'UtensilsCrossed',
    startTime: '11:30',
    endTime: '16:00',
    description: 'Full meals, thalis, biryani, and rice varieties'
  },
  DINING: {
    id: 'DINING',
    label: 'Evening Dining',
    icon: 'Moon',
    startTime: '16:00',
    endTime: '22:30',
    description: 'Snacks, chat, evening dinner rotis, and beverages'
  }
};

class SessionService {
  constructor() {
    this.sessions = { ...defaultSessions };
    this.manualOverride = null; // null for auto (time-based), or 'MORNING' | 'LUNCH' | 'DINING'
  }

  /**
   * Helper: convert "HH:MM" string into minutes from midnight
   */
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get current time in minutes from midnight
   */
  getCurrentTimeMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  /**
   * Determine the current active session
   */
  getActiveSession() {
    if (this.manualOverride && this.sessions[this.manualOverride]) {
      return {
        ...this.sessions[this.manualOverride],
        isOverride: true,
        timeRemainingText: 'Manual Session Override Active'
      };
    }

    const currentMinutes = this.getCurrentTimeMinutes();

    for (const key of Object.keys(this.sessions)) {
      const sess = this.sessions[key];
      const startMin = this.timeToMinutes(sess.startTime);
      const endMin = this.timeToMinutes(sess.endTime);

      if (currentMinutes >= startMin && currentMinutes < endMin) {
        const remainingMin = endMin - currentMinutes;
        const hoursLeft = Math.floor(remainingMin / 60);
        const minsLeft = remainingMin % 60;
        const timeRemainingText = hoursLeft > 0 
          ? `Closes in ${hoursLeft}h ${minsLeft}m`
          : `Closes in ${minsLeft}m`;

        return {
          ...sess,
          isOverride: false,
          timeRemainingMinutes: remainingMin,
          timeRemainingText
        };
      }
    }

    // Default fallback outside standard hours: Morning session or Late Dining
    return {
      ...this.sessions.MORNING,
      isOverride: false,
      timeRemainingText: 'Opens at 07:00 AM'
    };
  }

  /**
   * Set manual session override
   */
  setOverride(sessionId) {
    if (sessionId === null || sessionId === 'AUTO') {
      this.manualOverride = null;
      return { success: true, mode: 'AUTO', activeSession: this.getActiveSession() };
    }
    if (this.sessions[sessionId]) {
      this.manualOverride = sessionId;
      return { success: true, mode: 'MANUAL', activeSession: this.getActiveSession() };
    }
    return { success: false, error: 'Invalid session ID' };
  }

  /**
   * Update session time boundaries
   */
  updateSessionTimes(sessionId, startTime, endTime) {
    if (this.sessions[sessionId]) {
      this.sessions[sessionId].startTime = startTime;
      this.sessions[sessionId].endTime = endTime;
      return { success: true, session: this.sessions[sessionId] };
    }
    return { success: false, error: 'Session not found' };
  }

  getAllSessions() {
    return {
      activeSession: this.getActiveSession(),
      manualOverride: this.manualOverride,
      sessions: this.sessions
    };
  }
}

export const sessionService = new SessionService();
