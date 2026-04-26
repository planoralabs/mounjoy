/**
 * ReminderService
 * Handles the logic for dose frequency and reminders.
 */

export const ReminderService = {
    /**
     * Calculates the status of the next dose.
     * @param {Array} history - user.doseHistory array
     * @param {number} intervalDays - Frequency (default 7)
     * @returns {Object} { daysRemaining, status, nextDoseDate }
     */
    calculateNextDose: (history = [], intervalDays = 7, referenceDate = new Date()) => {
        if (!history || history.length === 0) {
            return { daysRemaining: 0, status: 'first_dose', nextDoseDate: referenceDate };
        }

        const lastDose = new Date(history[0].date);
        const nextDose = new Date(lastDose.getTime() + (Number(intervalDays) * 24 * 60 * 60 * 1000));
        
        // Use referenceDate for calculations (important for simulator)
        const now = referenceDate;

        // Reset hours for clean day comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const targeted = new Date(nextDose.getFullYear(), nextDose.getMonth(), nextDose.getDate());

        const diffTime = targeted - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = 'okay';
        if (diffDays === 0) status = 'due_today';
        if (diffDays < 0) status = 'overdue';

        return {
            daysRemaining: isNaN(diffDays) ? 0 : Math.max(0, diffDays),
            overdueDays: diffDays < 0 ? Math.abs(diffDays) : 0,
            status,
            nextDoseDate: nextDose
        };
    },

    /**
     * Formats the time until next dose for display.
     */
    formatTimeRemaining: (daysRemaining, status) => {
        if (status === 'overdue') return 'Vencida';
        if (status === 'due_today') return 'Hoje!';
        if (daysRemaining === 1) return 'Amanhã';
        return `${daysRemaining} dias`;
    }
};
