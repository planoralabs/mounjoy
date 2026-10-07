// Helpers shared by the Today, Journal and Progress screens: they read the
// same user record (measurements, doses, check-ins, photos, intake) and
// answer "what happened on day X" and "what is the latest value".

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day as YYYY-MM-DD (what the user sees as "that day"). */
export const dayKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const isSameDay = (a, b) => dayKey(a) === dayKey(b);

/**
 * Key of dailyIntakeHistory for a local day. Intake has always been stored
 * under the UTC date of "now" (toISOString), so we read a day at local noon,
 * which lands on the same UTC date for every realistic timezone.
 */
export const intakeKey = (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).toISOString().split('T')[0];
};

export const startOfDay = (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);

/**
 * ISO timestamp for a new record. Without `date` it is now; with a past or
 * future day (logging from the Journal) it is that day at the current time.
 */
export const recordDateFor = (date) => {
    const now = new Date();
    if (!date || isSameDay(date, now)) return now.toISOString();
    const d = new Date(date);
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    return d.toISOString();
};

const byDateAsc = (a, b) => new Date(a.date) - new Date(b.date);

/** Weigh-ins, oldest first. Body-measure-only entries (weight 0) are skipped. */
export const weightLogs = (user) =>
    (user?.measurements || []).filter((m) => parseFloat(m.weight) > 0).sort(byDateAsc);

/** Waist / hip entries, oldest first. */
export const bodyLogs = (user) =>
    (user?.measurements || []).filter((m) => parseFloat(m.waist) > 0 || parseFloat(m.hip) > 0).sort(byDateAsc);

// Waist and hip change slowly: Today suggests measuring every two weeks.
export const MEASURES_EVERY_DAYS = 14;

/**
 * Whether Today should suggest measuring waist and hip: never measured
 * ('first') or the last time was MEASURES_EVERY_DAYS or more ago ('due').
 */
export const measuresDue = (user, now = new Date()) => {
    const logs = bodyLogs(user);
    if (!logs.length) return 'first';
    return daysBetween(logs[logs.length - 1].date, now) >= MEASURES_EVERY_DAYS ? 'due' : null;
};

/** Most recent weigh-in (by date, not by insertion order). */
export const latestWeight = (user) => {
    const logs = weightLogs(user);
    return logs.length ? logs[logs.length - 1].weight : parseFloat(user?.currentWeight) || null;
};

export const startWeightOf = (user) => {
    const logs = weightLogs(user);
    return parseFloat(user?.startWeight) || (logs.length ? logs[0].weight : null) || user?.history?.[0] || latestWeight(user);
};

/** Doses, newest first (the order the rest of the app expects). */
export const sortedDoses = (user) => [...(user?.doseHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

// Older photos were saved as "data:image/webp" whatever their real format;
// iOS won't decode a JPEG/PNG behind that label, so fix it from the bytes.
const fixDataUriType = (uri) => {
    if (typeof uri !== 'string' || !uri.startsWith('data:image/webp;base64,')) return uri;
    const body = uri.slice('data:image/webp;base64,'.length);
    if (body.startsWith('/9j/')) return `data:image/jpeg;base64,${body}`;
    if (body.startsWith('iVBOR')) return `data:image/png;base64,${body}`;
    return uri;
};

export const photoUri = (photo) => fixDataUriType(typeof photo === 'string' ? photo : photo?.url);

/** Photos, oldest first. Legacy entries stored as bare strings have no date. */
export const sortedPhotos = (user) =>
    (user?.photos || [])
        .map((p, index) => ({ ...(typeof p === 'string' ? { url: p } : p), index }))
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

/** Weight logged within `maxDays` of `date`, or null. */
export const weightNear = (user, date, maxDays = 3) => {
    if (!date) return null;
    const target = new Date(date);
    let best = null;
    let bestDiff = Infinity;
    for (const m of weightLogs(user)) {
        const diff = Math.abs(new Date(m.date) - target);
        if (diff < bestDiff) { best = m; bestDiff = diff; }
    }
    return best && bestDiff <= maxDays * DAY_MS ? best.weight : null;
};

/** A check-in carries symptoms or a food-noise score; a note-only entry is a memory. */
export const isCheckIn = (log) => !log.isMemoryOnly && ((log.symptoms?.length || 0) > 0 || log.foodNoise !== undefined);

export const noteOf = (log) => log.note || log.notes || '';

/** Supplement logs of a day grouped by supplement: [{ id, name, count, date (latest) }]. */
export const supplementSummaryOn = (user, day) => {
    const groups = new Map();
    (user?.supplementLogs || []).filter((l) => isSameDay(l.date, day)).forEach((l) => {
        const g = groups.get(l.supplementId) || { id: l.supplementId, name: l.name, count: 0, date: l.date };
        g.count += 1;
        if (new Date(l.date) > new Date(g.date)) g.date = l.date;
        groups.set(l.supplementId, g);
    });
    return [...groups.values()];
};

/**
 * Everything recorded on a local day, newest first. `meals` comes from the
 * meal_logs table (only for signed-in users), the rest from the user record.
 */
export const entriesForDay = (user, date, meals = []) => {
    const key = dayKey(date);
    const onDay = (d) => d && dayKey(d) === key;
    const entries = [];

    sortedDoses(user).filter((d) => onDay(d.date)).forEach((d) => entries.push({ type: 'dose', date: d.date, data: d }));
    (user?.measurements || []).filter((m) => onDay(m.date)).forEach((m) => {
        if (parseFloat(m.weight) > 0) entries.push({ type: 'weight', date: m.date, data: m });
        if (parseFloat(m.waist) > 0 || parseFloat(m.hip) > 0) entries.push({ type: 'measures', date: m.date, data: m });
    });
    (user?.sideEffectsLogs || []).filter((l) => onDay(l.date)).forEach((l) =>
        entries.push({ type: isCheckIn(l) ? 'checkin' : 'note', date: l.date, data: l }));
    sortedPhotos(user).filter((p) => onDay(p.date)).forEach((p) => entries.push({ type: 'photo', date: p.date, data: p }));
    meals.filter((m) => onDay(m.logged_at)).forEach((m) => entries.push({ type: 'meal', date: m.logged_at, data: m }));
    // Supplements: one entry for the day listing each one taken (whey ×2…).
    const supplements = supplementSummaryOn(user, date);
    if (supplements.length) {
        const latest = supplements.map((g) => g.date).sort((a, b) => new Date(b) - new Date(a))[0];
        entries.push({ type: 'supplements', date: latest, data: supplements });
    }

    return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
};

/** Which kinds of records exist on a day — drives the calendar dots. */
export const markersForDay = (user, date, meals = []) => {
    const types = new Set(entriesForDay(user, date, meals).map((e) => (e.type === 'note' ? 'checkin' : e.type === 'measures' ? 'weight' : e.type)));
    return ['dose', 'weight', 'checkin', 'meal', 'photo', 'supplements'].filter((t) => types.has(t));
};

export const MARKER_COLORS = {
    dose: '#2563EB',
    weight: '#EA580C',
    checkin: '#EF4444',
    meal: '#F59E0B',
    photo: '#10B981',
    supplements: '#0EA5E9',
};
