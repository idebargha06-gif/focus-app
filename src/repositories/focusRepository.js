import {
  addDoc,
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  googleProvider,
  limit,
  onAuthStateChanged,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  signInWithPopup,
  signOut
} from "../services/firebase/client.js";
import { ROOM_PRESENCE_TTL_MS } from "../utils/constants.js";
import {
  formatSessionDateLabel,
  getRelativeIsoDay,
  normalizeDayCollection,
  normalizeDayValue,
  toIsoDayKey,
  toLegacyDayString
} from "../utils/date.js";
import { checkBadges } from "../utils/scoring.js";

function createDefaultStats() {
  return {
    totalScore: 0,
    totalSessions: 0,
    totalMinutes: 0,
    streak: 0,
    longestStreak: 0,
    weekData: [0, 0, 0, 0, 0, 0, 0],
    todayMinutes: 0,
    lastDistractions: 0,
    lastSessionDay: null,
    nightSession: false,
    badges: [],
    activityDays: []
  };
}

function normalizeStatsDoc(docData = {}) {
  const base = createDefaultStats();
  const activityDays = normalizeDayCollection([
    ...(Array.isArray(docData.activityDays) ? docData.activityDays : []),
    ...(Array.isArray(docData.sessionDates) ? docData.sessionDates : [])
  ]);
  const lastSessionDay = normalizeDayValue(docData.lastSessionDay || docData.lastSessionDate);
  const todayIsoDay = toIsoDayKey(new Date());

  return {
    totalScore: docData.total || 0,
    totalSessions: docData.totalSessions || 0,
    totalMinutes: docData.totalMinutes || 0,
    streak: docData.streak || 0,
    longestStreak: docData.longestStreak || 0,
    weekData: Array.isArray(docData.weekData) && docData.weekData.length === 7 ? docData.weekData : base.weekData,
    todayMinutes: lastSessionDay === todayIsoDay ? docData.todayMinutes || 0 : 0,
    lastDistractions: docData.lastDistractions || 0,
    lastSessionDay,
    nightSession: docData.nightSession || false,
    badges: Array.isArray(docData.badges) ? docData.badges : [],
    activityDays
  };
}

function normalizeSession(docSnapshot) {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    goal: data.goal || "Untitled session",
    dateLabel: data.date || formatSessionDateLabel(data.timestamp || Date.now()),
    timeSpent: data.timeSpent || 0,
    distractions: data.distractions || 0,
    score: data.score || 0,
    sessionMode: data.mode || "normal",
    createdAt: data.timestamp || Date.now()
  };
}

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}

export function subscribeLandingLeaderboard(callback) {
  const leaderboardQuery = query(collection(db, "users"), orderBy("total", "desc"), limit(5));

  return onSnapshot(leaderboardQuery, (snapshot) => {
    const entries = snapshot.docs.map((entry, index) => ({
      id: entry.id,
      rank: index + 1,
      name: entry.data().name || "Anonymous",
      score: entry.data().total || 0
    }));

    callback(entries);
  });
}

export async function fetchPublicStats() {
  const snapshot = await getDocs(collection(db, "users"));
  let totalMinutes = 0;
  let totalSessions = 0;

  snapshot.forEach((entry) => {
    totalMinutes += entry.data().totalMinutes || 0;
    totalSessions += entry.data().totalSessions || 0;
  });

  return {
    totalMinutes,
    totalSessions,
    totalUsers: snapshot.size
  };
}

export function subscribeGlobalLeaderboard(callback) {
  const leaderboardQuery = query(collection(db, "users"), orderBy("total", "desc"), limit(10));

  return onSnapshot(leaderboardQuery, (snapshot) => {
    const entries = snapshot.docs.map((entry, index) => ({
      id: entry.id,
      rank: index + 1,
      name: entry.data().name || "Anonymous",
      score: entry.data().total || 0
    }));

    callback(entries);
  });
}

export function subscribeRoomLeaderboard(roomId, callback) {
  const leaderboardQuery = query(
    collection(db, "rooms", roomId, "scores"),
    orderBy("value", "desc"),
    limit(10)
  );

  return onSnapshot(leaderboardQuery, (snapshot) => {
    const entries = snapshot.docs.map((entry, index) => ({
      id: entry.id,
      rank: index + 1,
      name: entry.data().name || "Anonymous",
      uid: entry.data().uid || "",
      score: entry.data().value || 0
    }));

    callback(entries);
  });
}

export function subscribeRoomPresence(roomId, callback) {
  return onSnapshot(collection(db, "rooms", roomId, "presence"), (snapshot) => {
    const now = Date.now();
    const entries = snapshot.docs
      .map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          uid: data.uid || entry.id,
          name: data.name || "Anonymous",
          avatar: data.avatar || "",
          lastSeenAt: data.lastSeenAt || 0
        };
      })
      .filter((entry) => now - entry.lastSeenAt <= ROOM_PRESENCE_TTL_MS)
      .sort((left, right) => left.name.localeCompare(right.name));

    callback(entries);
  });
}

export async function upsertRoomPresence({ roomId, user }) {
  const presenceRef = doc(db, "rooms", roomId, "presence", user.uid);
  const now = Date.now();

  await setDoc(
    presenceRef,
    {
      uid: user.uid,
      name: user.displayName || user.email || "Anonymous",
      avatar: user.photoURL || "",
      joinedAt: now,
      lastSeenAt: now
    },
    { merge: true }
  );

  return presenceRef;
}

export async function removeRoomPresence(roomId, uid) {
  if (!roomId || !uid) {
    return;
  }

  await deleteDoc(doc(db, "rooms", roomId, "presence", uid));
}

export async function loadWorkspace(uid) {
  const userRef = doc(db, "users", uid);
  const sessionsQuery = query(collection(db, "users", uid, "sessions"), orderBy("timestamp", "desc"), limit(10));
  const [userSnapshot, sessionSnapshot] = await Promise.all([getDoc(userRef), getDocs(sessionsQuery)]);

  return {
    stats: normalizeStatsDoc(userSnapshot.exists() ? userSnapshot.data() : {}),
    history: sessionSnapshot.docs.map(normalizeSession)
  };
}

export async function saveSession({ user, sessionResult, roomId }) {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);
  const previousStats = normalizeStatsDoc(userSnapshot.exists() ? userSnapshot.data() : {});
  const now = new Date();
  const timestamp = now.getTime();
  const isoDay = toIsoDayKey(now);
  const legacyDay = toLegacyDayString(now);
  const yesterday = getRelativeIsoDay(-1);
  const minutesSpent = Math.floor(sessionResult.timeSpent / 60);
  const lastSessionDay = previousStats.lastSessionDay;

  const nextStreak = lastSessionDay === isoDay
    ? previousStats.streak
    : lastSessionDay === yesterday
      ? previousStats.streak + 1
      : 1;

  const weekData = [...previousStats.weekData];
  weekData[now.getDay()] += minutesSpent;

  const todayMinutes = lastSessionDay === isoDay
    ? previousStats.todayMinutes + minutesSpent
    : minutesSpent;

  const activityDays = normalizeDayCollection([...previousStats.activityDays, isoDay]);
  const nightSession = now.getHours() >= 23 || now.getHours() < 4;

  const nextStats = {
    totalScore: previousStats.totalScore + sessionResult.score,
    totalSessions: previousStats.totalSessions + 1,
    totalMinutes: previousStats.totalMinutes + minutesSpent,
    streak: nextStreak,
    longestStreak: Math.max(previousStats.longestStreak, nextStreak),
    weekData,
    todayMinutes,
    lastDistractions: sessionResult.distractions,
    lastSessionDay: isoDay,
    nightSession,
    activityDays
  };

  nextStats.badges = checkBadges(nextStats);

  const writes = [
    addDoc(collection(db, "users", user.uid, "sessions"), {
      goal: sessionResult.goal || "Untitled session",
      score: sessionResult.score,
      timeSpent: sessionResult.timeSpent,
      distractions: sessionResult.distractions,
      mode: sessionResult.sessionMode,
      timestamp,
      date: formatSessionDateLabel(now)
    }),
    setDoc(
      userRef,
      {
        total: nextStats.totalScore,
        totalSessions: nextStats.totalSessions,
        totalMinutes: nextStats.totalMinutes,
        streak: nextStats.streak,
        longestStreak: nextStats.longestStreak,
        weekData: nextStats.weekData,
        todayMinutes: nextStats.todayMinutes,
        lastDistractions: nextStats.lastDistractions,
        lastSessionDate: legacyDay,
        lastSessionDay: nextStats.lastSessionDay,
        nightSession: nextStats.nightSession,
        badges: nextStats.badges,
        name: user.displayName || user.email || "Anonymous",
        sessionDates: nextStats.activityDays,
        activityDays: nextStats.activityDays,
        updatedAt: timestamp
      },
      { merge: true }
    )
  ];

  if (roomId) {
    writes.push(
      addDoc(collection(db, "rooms", roomId, "scores"), {
        uid: user.uid,
        name: user.displayName || user.email || "Anonymous",
        value: sessionResult.score,
        timestamp
      })
    );
  }

  await Promise.all(writes);
  return loadWorkspace(user.uid);
}
