import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { hasSupabaseConfig, supabase } from "./lib/supabase";

const appFont =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const STORAGE_KEY = "golf-score-app-courses-v1";
const ROUNDS_STORAGE_KEY = "golf-score-app-rounds-v1";
const USER_PROFILE_STORAGE_KEY = "golf-score-app-user-profile-v1";
const THEME_STORAGE_KEY = "golf-score-app-theme-v1";
const MAX_SAVED_ROUNDS = 100;
const SCREEN_HORIZONTAL_PADDING = "16px";
const CARD_ROW_HORIZONTAL_PADDING = "12px";
const CARD_CONTAINER_HORIZONTAL_PADDING = "14px";
const HEADER_HORIZONTAL_INSET = "26px";
const HOME_SECTION_INSET = "0px";
const HEADER_CIRCLE_SIZE = "44px";
const HEADER_CIRCLE_RADIUS = "22px";
const CARD_FAVORITE_SIZE = "40px";
const CARD_FAVORITE_RADIUS = "20px";
const SHEET_CLOSE_DURATION = 220;

const stepperButtonStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  border: "1px solid #333",
  backgroundColor: "#1a1a1a",
  color: "white",
  fontSize: "22px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: appFont
};

function formatDateItalian(dateLike) {
  const date = new Date(dateLike);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function sanitizeRoundName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function receivedShotsToSymbols(value) {
  if (value === 0) return "—";
  if (value === 1) return "*";
  if (value === 2) return "**";
  if (value === 3) return "***";
  return "—";
}

function App() {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogStep, setDialogStep] = useState(1);

  const [courseName, setCourseName] = useState("");
  const [holesCount, setHolesCount] = useState(null);

  const [holesData, setHolesData] = useState([]);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);

  const [showStrokeInfo, setShowStrokeInfo] = useState(false);
  const [selectedStepper, setSelectedStepper] = useState("par");

  const [openedCourse, setOpenedCourse] = useState(null);
  const [showRoundSetup, setShowRoundSetup] = useState(false);
  const [roundSetup, setRoundSetup] = useState({
    competitionName: "",
    totalCompetitionHoles: 18,
    startHole: 1
  });

  const [roundScores, setRoundScores] = useState([]);
  const [savedRounds, setSavedRounds] = useState(() => {
    try {
      const stored = localStorage.getItem(ROUNDS_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  });
  const [showRoundsHistory, setShowRoundsHistory] = useState(false);
  const [roundAlreadySaved, setRoundAlreadySaved] = useState(false);

  const [manualReceivedShots, setManualReceivedShots] = useState({});

  const [firstNameDraft, setFirstNameDraft] = useState("");
  const [hcpDraft, setHcpDraft] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCourseCardId, setActiveCourseCardId] = useState(null);
  const [searchEmptyHintPulse, setSearchEmptyHintPulse] = useState(false);
  const [hcpHighlightActive, setHcpHighlightActive] = useState(false);
  const [estimatedHcpHighlightActive, setEstimatedHcpHighlightActive] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [sheetClosing, setSheetClosing] = useState(false);
  const [sheetTouchStartY, setSheetTouchStartY] = useState(null);
  const [selectedHistoryRound, setSelectedHistoryRound] = useState(null);
  const [historyRoundDetailTouchStartY, setHistoryRoundDetailTouchStartY] = useState(null);
  const [showPrivacyScreen, setShowPrivacyScreen] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authStep, setAuthStep] = useState("request");
  const [authForm, setAuthForm] = useState({
    email: "",
    firstName: "",
    hcp: ""
  });
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const previousHcpRef = useRef(null);
  const previousEstimatedHcpRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved || "light";
    } catch (error) {
      return "light";
    }
  });

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      if (!stored) {
        return {
          firstName: "Giuseppe",
          hcp: 36
        };
      }

      const parsed = JSON.parse(stored);
      return {
        firstName: parsed.firstName || "Giuseppe",
        hcp:
          typeof parsed.hcp === "number" || typeof parsed.hcp === "string"
            ? parsed.hcp
            : 36
      };
    } catch (error) {
      return {
        firstName: "Giuseppe",
        hcp: 36
      };
    }
  });

  const [savedCourses, setSavedCourses] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  });

  const isLight = theme === "light";

  const colors = useMemo(
    () => ({
      bg: isLight ? "#f5f5f3" : "#000000",
      text: isLight ? "#111111" : "#ffffff",
      subtext: isLight ? "#6b6b6b" : "#8c8c8c",
      card: isLight ? "#ffffff" : "#111111",
      cardSecondary: isLight ? "#f0f0ed" : "#171717",
      border: isLight ? "#e3e3dd" : "#222222",
      borderStrong: isLight ? "#d0d0c8" : "#333333",
      inputBg: isLight ? "#f4f4f1" : "#1a1a1a",
      inputBorder: isLight ? "#dddd d6".replace(" ", "") : "#333333",
      pillBg: isLight ? "#f2f2ee" : "#171717",
      pillBorder: isLight ? "#d7d7cf" : "#2b2b2b",
      green: "#2ecc71",
      greenDark: isLight ? "#eef9f2" : "#16261c",
      greenBorder: isLight ? "#b8e7c8" : "#244233",
      greenManualBg: isLight ? "#e6f8ec" : "#1b3022",
      greenManualBorder: isLight ? "#7cdb9f" : "#52d88b",
      overlay: isLight ? "rgba(245, 245, 243, 0.60)" : "rgba(0, 0, 0, 0.46)"
    }),
    [isLight]
  );

  const themedStepperButtonStyle = useMemo(
    () => ({
      ...stepperButtonStyle,
      border: `1px solid ${colors.borderStrong}`,
      backgroundColor: colors.inputBg,
      color: colors.text
    }),
    [colors]
  );

  const modalCloseButtonStyle = useMemo(
    () => ({
      marginTop: "12px",
      width: "100%",
      padding: "13px",
      backgroundColor: colors.cardSecondary,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      borderRadius: "12px",
      cursor: "pointer",
      fontFamily: appFont,
      fontSize: "15px"
    }),
    [colors]
  );

  const topSafeAreaBackdrop = (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "calc(env(safe-area-inset-top, 0px) + 20px)",
        backgroundColor: colors.bg,
        pointerEvents: "none",
        zIndex: 6,
        transform: "translateZ(0)",
        willChange: "transform"
      }}
    />
  );

  const stepperValueStyle = useMemo(
    () => ({
      flex: 1,
      height: "44px",
      borderRadius: "12px",
      border: `1px solid ${colors.borderStrong}`,
      backgroundColor: colors.inputBg,
      color: colors.text,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
      fontWeight: 600,
      fontFamily: appFont
    }),
    [colors]
  );

  const stepperInputStyle = useMemo(
    () => ({
      flex: 1,
      height: "44px",
      borderRadius: "12px",
      border: `1px solid ${colors.borderStrong}`,
      backgroundColor: colors.inputBg,
      color: colors.text,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
      fontWeight: 600,
      fontFamily: appFont,
      textAlign: "center",
      outline: "none",
      boxSizing: "border-box",
      width: "100%"
    }),
    [colors]
  );

  const hasActiveOverlay = showDialog || Boolean(activeSheet) || sheetClosing || Boolean(selectedHistoryRound);

  useLayoutEffect(() => {
    const rootElement = document.getElementById("root");
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
    const appleStatusBarMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );
    const runtimeColorScheme = isLight ? "light" : "dark";

    document.body.style.margin = "0";
    document.body.style.backgroundColor = colors.bg;
    document.body.style.color = colors.text;
    document.body.style.fontFamily = appFont;
    document.body.style.colorScheme = runtimeColorScheme;
    document.documentElement.style.backgroundColor = colors.bg;
    document.documentElement.style.color = colors.text;
    document.documentElement.style.colorScheme = runtimeColorScheme;
    if (rootElement) {
      rootElement.style.backgroundColor = colors.bg;
      rootElement.style.color = colors.text;
      rootElement.style.colorScheme = runtimeColorScheme;
    }
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", colors.bg);
    }
    if (colorSchemeMeta) {
      colorSchemeMeta.setAttribute("content", runtimeColorScheme);
    }
    if (appleStatusBarMeta) {
      appleStatusBarMeta.setAttribute(
        "content",
        isLight ? "default" : "black-translucent"
      );
    }

    return () => {
      document.body.style.margin = "";
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
      document.body.style.fontFamily = "";
      document.body.style.colorScheme = "";
      document.documentElement.style.backgroundColor = "";
      document.documentElement.style.color = "";
      document.documentElement.style.colorScheme = "";
      if (rootElement) {
        rootElement.style.backgroundColor = "";
        rootElement.style.color = "";
        rootElement.style.colorScheme = "";
      }
    };
  }, [colors.bg, colors.text, isLight]);

  useEffect(() => {
    if (!hasActiveOverlay) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    const previousDocumentOverscrollBehavior =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      document.documentElement.style.overscrollBehavior =
        previousDocumentOverscrollBehavior;
    };
  }, [hasActiveOverlay]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCourses));
  }, [savedCourses]);

  useEffect(() => {
    localStorage.setItem(ROUNDS_STORAGE_KEY, JSON.stringify(savedRounds));
  }, [savedRounds]);

  useEffect(() => {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session: activeSession }
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(activeSession);
      setAuthLoading(false);
    };

    loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    const metadata = session.user.user_metadata || {};
    const metadataFirstName =
      typeof metadata.firstName === "string" && metadata.firstName.trim() !== ""
        ? metadata.firstName.trim()
        : null;
    const metadataHcp =
      typeof metadata.hcp === "number" || typeof metadata.hcp === "string"
        ? Number(metadata.hcp)
        : null;

    setUserProfile((prev) => ({
      firstName: metadataFirstName || prev.firstName || "Giuseppe",
      hcp:
        metadataHcp !== null && !Number.isNaN(metadataHcp)
          ? Number(metadataHcp.toFixed(1))
          : prev.hcp
    }));
  }, [session]);

  const favorites = savedCourses.filter((course) => course.favorite);

  const filteredCourses = savedCourses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const showSearchEmptyState =
    searchQuery.trim() !== "" && filteredCourses.length === 0;

  useEffect(() => {
    if (!showSearchEmptyState) {
      setSearchEmptyHintPulse(false);
      return;
    }

    setSearchEmptyHintPulse(true);
    const timeoutId = window.setTimeout(() => {
      setSearchEmptyHintPulse(false);
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSearchEmptyState]);

  const currentHole =
    holesData[currentHoleIndex] || { hole: 1, par: 4, strokeIndex: "" };

  const totalPar = useMemo(() => {
    return holesData.reduce((sum, hole) => sum + Number(hole.par || 0), 0);
  }, [holesData]);

  const grossTotal = useMemo(() => {
    return roundScores.reduce((sum, score) => sum + Number(score || 0), 0);
  }, [roundScores]);

  const resetDialogState = () => {
    setDialogStep(1);
    setCourseName("");
    setHolesCount(null);
    setHolesData([]);
    setCurrentHoleIndex(0);
    setShowStrokeInfo(false);
    setSelectedStepper("par");
  };

  const openDialog = () => {
    resetDialogState();
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    resetDialogState();
  };

  const goToStepTwo = () => {
    if (courseName.trim() === "") return;
    setDialogStep(2);
  };

  const goBackToStepOne = () => {
    setDialogStep(1);
  };

  const goToIntroStep = () => {
    if (!holesCount) return;

    const generatedHoles = Array.from({ length: holesCount }, (_, index) => ({
      hole: index + 1,
      par: 4,
      strokeIndex: ""
    }));

    setHolesData(generatedHoles);
    setCurrentHoleIndex(0);
    setSelectedStepper("par");
    setDialogStep(3);
  };

  const startMapping = () => {
    setDialogStep(4);
    setSelectedStepper("par");
  };

  const goBackToStepTwoFromIntro = () => {
    setDialogStep(2);
  };

  const updateCurrentHoleField = (field, value) => {
    const updated = [...holesData];
    updated[currentHoleIndex] = {
      ...updated[currentHoleIndex],
      [field]: value
    };
    setHolesData(updated);
  };

  const adjustPar = (delta) => {
    const currentValue = Number(currentHole.par || 4);
    const nextValue = Math.min(5, Math.max(3, currentValue + delta));
    updateCurrentHoleField("par", nextValue);
  };

  const adjustStrokeIndex = (delta) => {
    const rawValue = currentHole.strokeIndex;
    const isEmpty =
      rawValue === "" || rawValue === null || typeof rawValue === "undefined";
    const currentValue = isEmpty ? 0 : Number(rawValue);

    if (delta < 0) {
      if (isEmpty || currentValue === 0) {
        updateCurrentHoleField("strokeIndex", 18);
        return;
      }

      const nextValue = currentValue === 1 ? 18 : currentValue - 1;
      updateCurrentHoleField("strokeIndex", nextValue);
      return;
    }

    if (delta > 0) {
      if (isEmpty || currentValue === 0) {
        updateCurrentHoleField("strokeIndex", 1);
        return;
      }

      const nextValue = currentValue === 18 ? 1 : currentValue + 1;
      updateCurrentHoleField("strokeIndex", nextValue);
    }
  };

  const handleStrokeInputChange = (value) => {
    if (value === "") {
      updateCurrentHoleField("strokeIndex", "");
      return;
    }

    const numericValue = value.replace(/\D/g, "");
    updateCurrentHoleField("strokeIndex", numericValue);
  };

  const normalizeStrokeInput = () => {
    if (currentHole.strokeIndex === "") return;

    let value = Number(currentHole.strokeIndex);

    if (Number.isNaN(value)) {
      updateCurrentHoleField("strokeIndex", "");
      return;
    }

    if (value < 1) value = 1;
    if (value > 18) value = 18;

    updateCurrentHoleField("strokeIndex", value);
  };

  const currentHoleCompleted =
    currentHole.par !== "" && currentHole.strokeIndex !== "";

  const nextHole = () => {
    if (!currentHoleCompleted) return;

    if (currentHoleIndex < holesData.length - 1) {
      setCurrentHoleIndex((prev) => prev + 1);
      setSelectedStepper("par");
    } else {
      setDialogStep(5);
    }
  };

  const previousHole = () => {
    if (currentHoleIndex > 0) {
      setCurrentHoleIndex((prev) => prev - 1);
      setSelectedStepper("par");
    } else {
      setDialogStep(3);
    }
  };

  const goBackFromSummary = () => {
    setDialogStep(4);
    setCurrentHoleIndex(holesData.length - 1);
    setSelectedStepper("par");
  };

  const saveCourse = () => {
    const newCourse = {
      id: Date.now(),
      name: courseName.trim(),
      favorite: false,
      totalPar,
      holesCount,
      holes: holesData,
      createdAt: Date.now()
    };

    setSavedCourses((prev) => [newCourse, ...prev]);
    closeDialog();
  };

  const toggleFavorite = (courseId) => {
    setSavedCourses((prev) =>
      prev.map((course) =>
        course.id === courseId
          ? { ...course, favorite: !course.favorite }
          : course
      )
    );

    if (openedCourse && openedCourse.id === courseId) {
      setOpenedCourse((prev) =>
        prev ? { ...prev, favorite: !prev.favorite } : prev
      );
    }
  };

  const prepareRoundSetup = (course) => {
    setOpenedCourse(course);
    setShowRoundSetup(true);
    setActiveSheet(null);
    setSheetClosing(false);
    setShowRoundsHistory(false);
    setRoundAlreadySaved(false);
    setManualReceivedShots({});
    setRoundSetup({
      competitionName: "",
      totalCompetitionHoles: course.holesCount === 18 ? 18 : 18,
      startHole: 1
    });
    setRoundScores([]);
  };

  const getCompetitionSequence = (course, totalCompetitionHoles, startHole) => {
    const courseHoleCount = Number(course.holesCount || 0);
    const start = Number(startHole || 1);

    if (!courseHoleCount || !course.holes || course.holes.length === 0) return [];

    return Array.from({ length: totalCompetitionHoles }, (_, index) => {
      const relativeIndex = (start - 1 + index) % courseHoleCount;
      const baseHole = course.holes[relativeIndex];
      const competitionHoleNumber = index + 1;
      const roundNumber = Math.floor(index / courseHoleCount) + 1;
      const totalRounds = totalCompetitionHoles / courseHoleCount;

      return {
        competitionHoleNumber,
        courseHoleNumber: baseHole.hole,
        par: baseHole.par,
        strokeIndex: baseHole.strokeIndex,
        roundNumber,
        totalRounds
      };
    });
  };

  const competitionHoles = useMemo(() => {
    if (!openedCourse) return [];

    return getCompetitionSequence(
      openedCourse,
      Number(roundSetup.totalCompetitionHoles),
      Number(roundSetup.startHole)
    );
  }, [openedCourse, roundSetup]);

  const startRound = () => {
    const startingScores = competitionHoles.map((hole) => Number(hole.par));
    setRoundScores(startingScores);
    setRoundAlreadySaved(false);
    setManualReceivedShots({});
    setShowRoundSetup(false);
  };

  const closeCourse = () => {
    setOpenedCourse(null);
    setShowRoundSetup(false);
    setActiveSheet(null);
    setSheetClosing(false);
    setRoundScores([]);
    setShowRoundsHistory(false);
    setRoundAlreadySaved(false);
    setManualReceivedShots({});
    setRoundSetup({
      competitionName: "",
      totalCompetitionHoles: 18,
      startHole: 1
    });
  };

  const getReceivedShots = useCallback((playerHcp, strokeIndex) => {
    const hcp = Math.floor(Number(playerHcp || 0));
    const si = Number(strokeIndex || 0);

    if (hcp <= 0 || si <= 0) return 0;

    return Math.max(0, Math.floor((hcp - si) / 18) + 1);
  }, []);

  const getAutomaticReceivedShots = useCallback(
    (playerHcp, strokeIndex) => {
      return Math.min(3, getReceivedShots(playerHcp, strokeIndex));
    },
    [getReceivedShots]
  );

  const getEffectiveReceivedShots = useCallback(
    (index, playerHcp, strokeIndex) => {
      const manualValue = manualReceivedShots[index];

      if (manualValue !== undefined && manualValue !== null && manualValue !== "") {
        return Number(manualValue);
      }

      return getAutomaticReceivedShots(playerHcp, strokeIndex);
    },
    [manualReceivedShots, getAutomaticReceivedShots]
  );

  const getStablefordPoints = useCallback((par, strokesMade, receivedShots) => {
    const parValue = Number(par || 0);
    const strokes = Number(strokesMade || 0);
    const shots = Number(receivedShots || 0);

    if (!strokes) return 0;

    return Math.max(0, 2 + parValue + shots - strokes);
  }, []);

  const getManualCycleValues = (autoValue) => {
    if (autoValue === 0) return [1, 2, 3];
    if (autoValue === 1) return [2, 3, 0];
    if (autoValue === 2) return [3, 0, 1];
    return [0, 1, 2];
  };

  const cycleReceivedShotsValue = (index, autoValue) => {
    const manualValue = manualReceivedShots[index];
    const cycleValues = getManualCycleValues(autoValue);

    if (manualValue === undefined) {
      setManualReceivedShots((prev) => ({
        ...prev,
        [index]: cycleValues[0]
      }));
      setRoundAlreadySaved(false);
      return;
    }

    if (manualValue === cycleValues[0]) {
      setManualReceivedShots((prev) => ({
        ...prev,
        [index]: cycleValues[1]
      }));
      setRoundAlreadySaved(false);
      return;
    }

    if (manualValue === cycleValues[1]) {
      setManualReceivedShots((prev) => ({
        ...prev,
        [index]: cycleValues[2]
      }));
      setRoundAlreadySaved(false);
      return;
    }

    setManualReceivedShots((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    setRoundAlreadySaved(false);
  };

  const stablefordTotal = useMemo(() => {
    if (!competitionHoles.length) return 0;

    return competitionHoles.reduce((sum, hole, index) => {
      const receivedShots = getEffectiveReceivedShots(
        index,
        userProfile.hcp,
        hole.strokeIndex
      );
      const points = getStablefordPoints(
        hole.par,
        roundScores[index],
        receivedShots
      );
      return sum + points;
    }, 0);
  }, [
    competitionHoles,
    roundScores,
    userProfile.hcp,
    getEffectiveReceivedShots,
    getStablefordPoints
  ]);

  const netTotal = useMemo(() => {
    if (!competitionHoles.length) return 0;

    return competitionHoles.reduce((sum, hole, index) => {
      const receivedShots = getEffectiveReceivedShots(
        index,
        userProfile.hcp,
        hole.strokeIndex
      );
      const strokes = Number(roundScores[index] || 0);
      if (!strokes) return sum;
      return sum + (strokes - receivedShots);
    }, 0);
  }, [competitionHoles, roundScores, userProfile.hcp, getEffectiveReceivedShots]);

  const estimatedHcpAfterRound = useMemo(() => {
    if (!competitionHoles.length || stablefordTotal === 0) return userProfile.hcp;

    let delta = 0;

    if (stablefordTotal >= 37) {
      delta = -Math.min(1.8, (stablefordTotal - 36) * 0.1);
    } else if (stablefordTotal <= 30) {
      delta = Math.min(1.2, (31 - stablefordTotal) * 0.05);
    }

    const next = Math.max(0, Number(userProfile.hcp) + delta);
    return Number(next.toFixed(1));
  }, [competitionHoles.length, stablefordTotal, userProfile.hcp]);

  useEffect(() => {
    if (previousHcpRef.current === null) {
      previousHcpRef.current = userProfile.hcp;
      return;
    }

    if (previousHcpRef.current !== userProfile.hcp) {
      setHcpHighlightActive(true);
      const timeoutId = window.setTimeout(() => {
        setHcpHighlightActive(false);
      }, 320);
      previousHcpRef.current = userProfile.hcp;

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [userProfile.hcp]);

  useEffect(() => {
    if (previousEstimatedHcpRef.current === null) {
      previousEstimatedHcpRef.current = estimatedHcpAfterRound;
      return;
    }

    if (previousEstimatedHcpRef.current !== estimatedHcpAfterRound) {
      setEstimatedHcpHighlightActive(true);
      const timeoutId = window.setTimeout(() => {
        setEstimatedHcpHighlightActive(false);
      }, 320);
      previousEstimatedHcpRef.current = estimatedHcpAfterRound;

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [estimatedHcpAfterRound]);

  const updateRoundScore = (index, value) => {
    const updated = [...roundScores];
    updated[index] = value;
    setRoundScores(updated);
    setRoundAlreadySaved(false);
  };

  const getRoundScoreBounds = (index) => {
    const holePar = Number(competitionHoles[index]?.par || 0);
    const min = 1;
    const max = Math.max(min, holePar + 4);

    return { min, max };
  };

  const handleScoreInputChange = (index, value) => {
    if (value === "") {
      updateRoundScore(index, "");
      return;
    }

    const numericValue = value.replace(/\D/g, "");
    updateRoundScore(index, numericValue);
  };

  const normalizeScoreInput = (index) => {
    const rawValue = roundScores[index];
    const { min, max } = getRoundScoreBounds(index);

    if (rawValue === "") {
      updateRoundScore(index, min);
      return;
    }

    let value = Number(rawValue);

    if (Number.isNaN(value)) {
      updateRoundScore(index, min);
      return;
    }

    if (value < min) value = min;
    if (value > max) value = max;

    updateRoundScore(index, value);
  };

  const adjustRoundScore = (index, delta) => {
    const { min, max } = getRoundScoreBounds(index);
    const rawValue = roundScores[index];
    const isEmpty =
      rawValue === "" || rawValue === null || typeof rawValue === "undefined";
    const currentValue = isEmpty ? min : Number(rawValue);

    if (delta < 0) {
      updateRoundScore(index, currentValue <= min ? max : currentValue - 1);
      return;
    }

    if (delta > 0) {
      updateRoundScore(index, currentValue >= max ? min : currentValue + 1);
    }
  };

  const saveRound = () => {
    if (!openedCourse || !competitionHoles.length || roundAlreadySaved) return;

    const formattedDate = formatDateItalian(Date.now());
    const cleanCompetitionName = sanitizeRoundName(roundSetup.competitionName);
    const savedName =
      cleanCompetitionName !== ""
        ? `${cleanCompetitionName}_${formattedDate}`
        : `Giro_${formattedDate}`;

    const newRound = {
      id: Date.now(),
      savedName,
      competitionName: cleanCompetitionName || "Giro",
      courseId: openedCourse.id,
      courseName: openedCourse.name,
      createdAt: Date.now(),
      formattedDate,
      playerHcp: userProfile.hcp,
      totalCompetitionHoles: roundSetup.totalCompetitionHoles,
      startHole: roundSetup.startHole,
      grossTotal,
      netTotal,
      stablefordTotal,
      estimatedHcpAfterRound,
      scores: roundScores,
      manualReceivedShots
    };

    setSavedRounds((prev) => [newRound, ...prev].slice(0, MAX_SAVED_ROUNDS));
    setRoundAlreadySaved(true);
    setShowRoundsHistory(true);
  };

  const roundsForOpenedCourse = openedCourse
    ? savedRounds.filter((round) => round.courseId === openedCourse.id)
    : [];

  const openHistoryFromMenu = () => {
    setShowRoundsHistory(false);
    setSheetClosing(false);
    flushSync(() => {
      setActiveSheet("history");
    });
  };

  const closeHistoryRoundDetail = () => {
    setHistoryRoundDetailTouchStartY(null);
    setSelectedHistoryRound(null);
  };

  const openPrivacyScreen = () => {
    closeActiveSheet();
    window.setTimeout(() => {
      setShowPrivacyScreen(true);
    }, 220);
  };

  const openHcpEditor = () => {
    setFirstNameDraft(String(userProfile.firstName || ""));
    setHcpDraft(String(userProfile.hcp));
    setSheetClosing(false);
    flushSync(() => {
    setActiveSheet("hcp");
  });
  };

  const handleThemeSelection = (nextTheme) => {
    if (theme === nextTheme) {
      closeActiveSheet();
      return;
    }

    flushSync(() => {
      setTheme(nextTheme);
    });
    closeActiveSheet();
  };

  const deleteRound = (roundId) => {
    setSavedRounds((prev) => prev.filter((round) => round.id !== roundId));
    setSelectedHistoryRound((prev) => (prev?.id === roundId ? null : prev));
  };

  const getHistoryRoundCompetitionHoles = useCallback(
    (round) => {
      if (!round) return [];

      const relatedCourse = savedCourses.find((course) => course.id === round.courseId);
      if (!relatedCourse) return [];

      return getCompetitionSequence(
        relatedCourse,
        Number(round.totalCompetitionHoles),
        Number(round.startHole)
      );
    },
    [savedCourses]
  );

  const getHistoryRoundReceivedShots = useCallback(
    (round, hole, index) => {
      if (!round || !hole) return 0;

      const manualValue = round.manualReceivedShots?.[index];
      if (manualValue !== undefined && manualValue !== null && manualValue !== "") {
        return Number(manualValue);
      }

      return getAutomaticReceivedShots(round.playerHcp, hole.strokeIndex);
    },
    [getAutomaticReceivedShots]
  );

  const persistMissingUserProfile = async (activeUser) => {
    if (!supabase || !activeUser) return;

    const pendingFirstName = authForm.firstName.trim();
    const pendingHcp =
      authForm.hcp === "" ? null : Number(String(authForm.hcp).replace(",", "."));
    const metadata = activeUser.user_metadata || {};
    const nextData = {};

    if (
      pendingFirstName &&
      (typeof metadata.firstName !== "string" || metadata.firstName.trim() === "")
    ) {
      nextData.firstName = pendingFirstName;
    }

    if (
      pendingHcp !== null &&
      !Number.isNaN(pendingHcp) &&
      pendingHcp >= 0 &&
      (typeof metadata.hcp !== "number" && typeof metadata.hcp !== "string")
    ) {
      nextData.hcp = Number(pendingHcp.toFixed(1));
    }

    if (Object.keys(nextData).length === 0) return;

    await supabase.auth.updateUser({
      data: {
        ...metadata,
        ...nextData
      }
    });
  };

  const handleAuthSubmit = async () => {
    if (!supabase) {
      setAuthError("Configurazione Supabase mancante.");
      return;
    }

    const email = authForm.email.trim();
    const firstName = authForm.firstName.trim();
    const hcpValue =
      authForm.hcp === "" ? null : Number(String(authForm.hcp).replace(",", "."));

    if (!email) {
      setAuthError("Inserisci l'email.");
      setAuthMessage("");
      return;
    }

    if (!firstName) {
      setAuthError("Inserisci il nome del giocatore.");
      setAuthMessage("");
      return;
    }

    if (hcpValue !== null && (Number.isNaN(hcpValue) || hcpValue < 0)) {
      setAuthError("Inserisci un HCP valido.");
      setAuthMessage("");
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setAuthSubmitting(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          firstName,
          ...(hcpValue !== null ? { hcp: Number(hcpValue.toFixed(1)) } : {})
        }
      }
    });

    if (error) {
      setAuthError(error.message);
      setAuthSubmitting(false);
      return;
    }

    setAuthMessage("");
    setOtpCode("");
    setAuthStep("verify");
    setAuthSubmitting(false);
  };

  const handleVerifyOtp = async () => {
    if (!supabase) {
      setAuthError("Codice non valido o scaduto");
      return;
    }

    const email = authForm.email.trim();
    const token = otpCode.trim();

    if (!token) {
      setAuthError("Inserisci il codice.");
      setAuthMessage("");
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setAuthSubmitting(true);

    const {
      data: { user },
      error
    } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email"
    });

    if (error) {
      setAuthError("Codice non valido o scaduto");
      setAuthSubmitting(false);
      return;
    }

    await persistMissingUserProfile(user);
    setAuthMessage("Accesso completato");
    setAuthSubmitting(false);
  };

  const handleResendOtp = async () => {
    setAuthError("");
    setAuthMessage("");
    await handleAuthSubmit();
  };

  const handleLogout = async () => {
    if (!supabase) return;
    const emailToKeep = session?.user?.email || authForm.email || "";
    await supabase.auth.signOut();
    setAuthForm((prev) => ({
      ...prev,
      email: emailToKeep
    }));
    setAuthStep("request");
    setOtpCode("");
    setAuthError("");
    setAuthMessage("");
    setActiveSheet(null);
    setSheetClosing(false);
  };

  const closeHcpEditor = () => {
    closeActiveSheet();
  };

  const saveHcp = async () => {
    const cleanName = firstNameDraft.trim();
    const cleanValue = String(hcpDraft).replace(",", ".").trim();
    const numeric = Number(cleanValue);

    if (!cleanName || Number.isNaN(numeric) || numeric < 0) return;

    setUserProfile((prev) => ({
      ...prev,
      firstName: cleanName,
      hcp: Number(numeric.toFixed(1))
    }));

    if (supabase && session?.user) {
      await supabase.auth.updateUser({
        data: {
          ...(session.user.user_metadata || {}),
          firstName: cleanName,
          hcp: Number(numeric.toFixed(1))
        }
      });
    }

    closeHcpEditor();
  };

  const closeActiveSheet = () => {
    if (
      document.activeElement &&
      typeof document.activeElement.blur === "function"
    ) {
      document.activeElement.blur();
    }

    setSheetClosing(true);
    setSheetTouchStartY(null);

    window.setTimeout(() => {
      setActiveSheet(null);
      setSheetClosing(false);
      setFirstNameDraft("");
      setHcpDraft("");
    }, SHEET_CLOSE_DURATION);
  };

  const handleSheetTouchStart = (event) => {
    setSheetTouchStartY(event.touches[0]?.clientY ?? null);
  };

  const handleSheetTouchEnd = (event) => {
    if (sheetTouchStartY === null) return;

    const touchEndY = event.changedTouches[0]?.clientY ?? sheetTouchStartY;
    if (touchEndY - sheetTouchStartY > 70) {
      closeActiveSheet();
    } else {
      setSheetTouchStartY(null);
    }
  };

  const handleHistoryRoundDetailTouchStart = (event) => {
    setHistoryRoundDetailTouchStartY(event.touches[0]?.clientY ?? null);
  };

  const handleHistoryRoundDetailTouchEnd = (event) => {
    if (historyRoundDetailTouchStartY === null) return;

    const touchEndY =
      event.changedTouches[0]?.clientY ?? historyRoundDetailTouchStartY;
    if (touchEndY - historyRoundDetailTouchStartY > 70) {
      closeHistoryRoundDetail();
    } else {
      setHistoryRoundDetailTouchStartY(null);
    }
  };

  const sheetModal = activeSheet ? (
    <div
      onClick={closeActiveSheet}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: colors.overlay,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box",
        zIndex: 40
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleSheetTouchStart}
        onTouchEnd={handleSheetTouchEnd}
        style={{
          backgroundColor: colors.card,
          padding: "16px",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "382px",
          border: `1px solid ${colors.border}`,
          boxSizing: "border-box",
          fontFamily: appFont,
          transform: sheetClosing
            ? "translateY(18px) scale(0.985)"
            : "translateY(0) scale(1)",
          opacity: sheetClosing ? 0 : 1,
          transition: sheetClosing
            ? `transform ${SHEET_CLOSE_DURATION}ms cubic-bezier(0.4, 0, 1, 1), opacity ${SHEET_CLOSE_DURATION}ms cubic-bezier(0.4, 0, 1, 1)`
            : "none",
          willChange: "transform, opacity",
          touchAction: "pan-y"
        }}
      >
        <div
          style={{
            width: "38px",
            height: "4px",
            borderRadius: "999px",
            backgroundColor: colors.borderStrong,
            opacity: 0.7,
            margin: "0 auto 12px auto"
          }}
        />

        {activeSheet === "menu" && (
          <>
            <div
              style={{
                paddingTop: "2px"
              }}
            >
              <button
                onClick={openHcpEditor}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 0",
                  border: "none",
                  background: "transparent",
                  color: colors.text,
                  fontSize: "15px",
                  cursor: "pointer",
                  fontFamily: appFont
                }}
              >
                Giocatore
              </button>

              <button
                onClick={openHistoryFromMenu}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 0 2px 0",
                  border: "none",
                  background: "transparent",
                  color: colors.text,
                  fontSize: "15px",
                  cursor: "pointer",
                  fontFamily: appFont
                }}
              >
                I tuoi giri
              </button>
            </div>

            <div
              style={{
                paddingTop: "16px",
                paddingBottom: "4px"
              }}
            >
              <div style={{ fontSize: "15px", marginBottom: "8px" }}>Tema</div>

              <div style={{ display: "flex", gap: "8px", marginLeft: "1px" }}>
                <button
                  onClick={() => handleThemeSelection("light")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "10px",
                    border:
                      theme === "light"
                        ? `1px solid ${colors.green}`
                        : `1px solid ${colors.borderStrong}`,
                    backgroundColor:
                      theme === "light" ? colors.greenDark : colors.inputBg,
                    color: colors.text,
                    cursor: "pointer",
                    fontFamily: appFont
                  }}
                >
                  Chiaro
                </button>

                <button
                  onClick={() => handleThemeSelection("dark")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "10px",
                    border:
                      theme === "dark"
                        ? `1px solid ${colors.green}`
                        : `1px solid ${colors.borderStrong}`,
                    backgroundColor:
                      theme === "dark" ? colors.greenDark : colors.inputBg,
                    color: colors.text,
                    cursor: "pointer",
                    fontFamily: appFont
                  }}
                >
                  Scuro
                </button>
              </div>

              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  gap: "8px",
                  marginLeft: "1px"
                }}
              >
                <button
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "10px",
                    border: `1px solid ${colors.green}`,
                    backgroundColor: colors.greenDark,
                    color: colors.text,
                    cursor: "default",
                    fontFamily: appFont
                  }}
                >
                  Italiano
                </button>

                <button
                  disabled
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "10px",
                    border: `1px solid ${colors.borderStrong}`,
                    backgroundColor: colors.inputBg,
                    color: colors.subtext,
                    cursor: "not-allowed",
                    fontFamily: appFont,
                    opacity: 0.8
                  }}
                >
                  English
                </button>
              </div>
            </div>

            <div
              style={{
                paddingTop: "16px",
                paddingBottom: "2px"
              }}
            >
              <button
                onClick={openPrivacyScreen}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: colors.subtext,
                  opacity: 0.78,
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: appFont
                }}
              >
                Privacy Policy
              </button>
            </div>

            <div style={{ paddingTop: "34px" }}>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 0 2px 0",
                  border: "none",
                  background: "transparent",
                  color: colors.text,
                  fontSize: "15px",
                  cursor: "pointer",
                  fontFamily: appFont
                }}
              >
                Esci
              </button>
            </div>

            <button onClick={closeActiveSheet} style={modalCloseButtonStyle}>
              Chiudi
            </button>
          </>
        )}

        {activeSheet === "hcp" && (
          <>
            <h3
              style={{
                marginTop: 0,
                marginBottom: "8px",
                fontSize: "22px",
                fontWeight: 700
              }}
            >
              Modifica profilo
            </h3>

            <p
              style={{
                color: colors.subtext,
                fontSize: "14px",
                marginTop: 0,
                marginBottom: "14px",
                lineHeight: 1.4
              }}
            >
              Aggiorna il nome e il tuo HCP.
            </p>

            <input
              type="text"
              value={firstNameDraft}
              onChange={(e) => setFirstNameDraft(e.target.value)}
              placeholder="Il tuo nome"
              style={{
                width: "100%",
                padding: "13px 14px",
                backgroundColor: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "12px",
                color: colors.text,
                boxSizing: "border-box",
                outline: "none",
                fontSize: "16px",
                fontFamily: appFont,
                marginBottom: "12px"
              }}
            />

            <input
              type="text"
              inputMode="decimal"
              value={hcpDraft}
              onChange={(e) => setHcpDraft(e.target.value)}
              placeholder="Es. 36"
              style={{
                width: "100%",
                padding: "13px 14px",
                backgroundColor: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "12px",
                color: colors.text,
                boxSizing: "border-box",
                outline: "none",
                fontSize: "16px",
                fontFamily: appFont
              }}
            />

            <button onClick={saveHcp} style={{
              marginTop: "20px",
              width: "100%",
              padding: "13px",
              backgroundColor: colors.green,
              border: "none",
              color: isLight ? "#08351c" : "black",
              fontWeight: 700,
              borderRadius: "12px",
              cursor: "pointer",
              opacity: 1,
              fontFamily: appFont,
              fontSize: "15px"
            }}>
              Salva
            </button>

            <button onClick={closeActiveSheet} style={modalCloseButtonStyle}>
              Chiudi
            </button>
          </>
        )}

        {activeSheet === "history" && (
          <>
            {savedRounds.length === 0 ? (
              <div
                style={{
                  color: colors.subtext,
                  lineHeight: 1.5,
                  backgroundColor: colors.cardSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "14px",
                  padding: "16px"
                }}
              >
                Nessun giro salvato per ora.
              </div>
            ) : (
              savedRounds.map((round) => (
                <div
                  key={round.id}
                  onClick={() => {
                    setActiveSheet(null);
                    setSelectedHistoryRound(round);
                  }}
                  style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "16px",
                    padding: "18px",
                    marginBottom: "12px",
                    cursor: "pointer"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px"
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>
                      {round.savedName}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRound(round.id);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: colors.subtext,
                        cursor: "pointer",
                        fontFamily: appFont,
                        fontSize: "12px",
                        padding: 0
                      }}
                    >
                      Elimina
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      color: colors.subtext,
                      fontSize: "12px"
                    }}
                  >
                    {round.courseName} • {round.formattedDate}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginTop: "12px"
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: colors.pillBg,
                        border: `1px solid ${colors.pillBorder}`,
                        fontSize: "13px"
                      }}
                    >
                      L {round.grossTotal}
                    </div>
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: colors.pillBg,
                        border: `1px solid ${colors.pillBorder}`,
                        fontSize: "13px"
                      }}
                    >
                      N {round.netTotal}
                    </div>
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: colors.greenDark,
                        border: `1px solid ${colors.greenBorder}`,
                        color: colors.green,
                        fontSize: "13px"
                      }}
                    >
                      S {round.stablefordTotal}
                    </div>
                  </div>
                </div>
              ))
            )}

            <button onClick={closeActiveSheet} style={modalCloseButtonStyle}>
              Chiudi
            </button>
          </>
        )}
      </div>
    </div>
  ) : null;
  const hcpEditorModal = null;
  const globalRoundsHistoryModal = null;

  const historyRoundDetailModal = selectedHistoryRound ? (
    <div
      onClick={closeHistoryRoundDetail}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: colors.overlay,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box",
        zIndex: 42
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleHistoryRoundDetailTouchStart}
        onTouchEnd={handleHistoryRoundDetailTouchEnd}
        style={{
          backgroundColor: colors.card,
          padding: "18px",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "390px",
          maxHeight: "85vh",
          overflowY: "auto",
          border: `1px solid ${colors.border}`,
          boxSizing: "border-box",
          fontFamily: appFont
        }}
      >
        <div
          style={{
            width: "38px",
            height: "4px",
            borderRadius: "999px",
            backgroundColor: colors.borderStrong,
            opacity: 0.7,
            margin: "0 auto 12px auto"
          }}
        />

        <div style={{ fontSize: "18px", fontWeight: 700 }}>
          {selectedHistoryRound.savedName}
        </div>
        <div
          style={{
            marginTop: "4px",
            color: colors.subtext,
            fontSize: "13px",
            lineHeight: 1.5
          }}
        >
          {selectedHistoryRound.courseName} • {selectedHistoryRound.formattedDate}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "8px",
            marginTop: "14px"
          }}
        >
          <div
            style={{
              padding: "9px 10px",
              borderRadius: "12px",
              backgroundColor: colors.pillBg,
              border: `1px solid ${colors.pillBorder}`,
              fontSize: "12px",
              textAlign: "center",
              whiteSpace: "nowrap"
            }}
          >
            Lordo {selectedHistoryRound.grossTotal}
          </div>
          <div
            style={{
              padding: "9px 10px",
              borderRadius: "12px",
              backgroundColor: colors.pillBg,
              border: `1px solid ${colors.pillBorder}`,
              fontSize: "12px",
              textAlign: "center",
              whiteSpace: "nowrap"
            }}
          >
            Netto {selectedHistoryRound.netTotal}
          </div>
          <div
            style={{
              padding: "9px 10px",
              borderRadius: "12px",
              backgroundColor: colors.greenDark,
              border: `1px solid ${colors.greenBorder}`,
              color: colors.green,
              fontSize: "12px",
              textAlign: "center",
              whiteSpace: "nowrap"
            }}
          >
            Stableford {selectedHistoryRound.stablefordTotal}
          </div>
        </div>

        <div
          style={{
            marginTop: "16px",
            overflowX: "auto",
            border: `1px solid ${colors.border}`,
            borderRadius: "14px"
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "472px",
              fontSize: "13px"
            }}
          >
            <thead>
              <tr style={{ backgroundColor: colors.cardSecondary, color: colors.subtext }}>
                <th style={{ textAlign: "left", padding: "12px" }}>Buca</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Par</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Colpi</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Netto</th>
                <th style={{ textAlign: "left", padding: "12px" }}>Pt</th>
              </tr>
            </thead>
            <tbody>
              {getHistoryRoundCompetitionHoles(selectedHistoryRound).map((hole, index) => {
                const receivedShots = getHistoryRoundReceivedShots(
                  selectedHistoryRound,
                  hole,
                  index
                );
                const strokes = Number(selectedHistoryRound.scores?.[index] || 0);
                const netScore = strokes ? strokes - receivedShots : "—";
                const points = getStablefordPoints(hole.par, strokes, receivedShots);

                return (
                  <tr
                    key={`${selectedHistoryRound.id}-${hole.competitionHoleNumber}-${index}`}
                    style={{
                      borderTop: `1px solid ${colors.border}`
                    }}
                  >
                    <td style={{ padding: "12px" }}>{hole.competitionHoleNumber}</td>
                    <td style={{ padding: "12px" }}>{hole.par}</td>
                    <td style={{ padding: "12px" }}>{strokes || "—"}</td>
                    <td style={{ padding: "12px" }}>{netScore}</td>
                    <td style={{ padding: "12px", color: colors.green, fontWeight: 600 }}>
                      {points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button onClick={closeHistoryRoundDetail} style={modalCloseButtonStyle}>
          Chiudi
        </button>
      </div>
    </div>
  ) : null;

  const overlayPortal =
    typeof document !== "undefined"
      ? createPortal(
          <>
            {sheetModal}
            {globalRoundsHistoryModal}
            {historyRoundDetailModal}
            {hcpEditorModal}
          </>,
          document.body
        )
      : null;

  const titleStyle = {
    fontSize: "22px",
    fontWeight: 600,
    letterSpacing: "0.2px",
    marginTop: "28px",
    marginBottom: "14px",
    fontFamily: appFont
  };

  const primaryButtonStyle = (enabled = true) => ({
    marginTop: "20px",
    width: "100%",
    padding: "13px",
    backgroundColor: enabled ? colors.green : isLight ? "#bfd9c9" : "#244233",
    border: "none",
    color: enabled ? (isLight ? "#08351c" : "black") : isLight ? "#496457" : "black",
    fontWeight: 700,
    borderRadius: "12px",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.7,
    fontFamily: appFont,
    fontSize: "15px"
  });

  const secondaryButtonStyle = {
    marginTop: "10px",
    width: "100%",
    padding: "13px",
    backgroundColor: colors.cardSecondary,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    borderRadius: "12px",
    cursor: "pointer",
    fontFamily: appFont,
    fontSize: "15px"
  };

  const subtleButtonStyle = {
    marginTop: "10px",
    width: "100%",
    padding: "13px",
    backgroundColor: colors.cardSecondary,
    border: `1px solid ${colors.borderStrong}`,
    color: colors.subtext,
    borderRadius: "12px",
    cursor: "pointer",
    fontFamily: appFont,
    fontSize: "15px"
  };

  const stepperCardStyle = (active) => ({
    marginBottom: "16px",
    padding: "14px",
    borderRadius: "14px",
    border: active ? `1px solid ${colors.green}` : `1px solid ${colors.border}`,
    backgroundColor: active ? colors.greenDark : colors.card,
    transition: "all 0.2s ease",
    cursor: "pointer"
  });

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
          color: colors.text,
          fontFamily: appFont,
          padding: "24px",
          boxSizing: "border-box"
        }}
      >
        Caricamento...
      </div>
    );
  }

  if (!hasSupabaseConfig) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: colors.bg,
          color: colors.text,
          fontFamily: appFont,
          padding: "24px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: "24px",
            padding: "24px",
            boxSizing: "border-box"
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 700 }}>Configura Supabase</div>
          <div
            style={{
              marginTop: "10px",
              color: colors.subtext,
              lineHeight: 1.5,
              fontSize: "14px"
            }}
          >
            Manca la configurazione `REACT_APP_SUPABASE_URL` e/o
            `REACT_APP_SUPABASE_ANON_KEY` nel file `.env.local`.
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: colors.bg,
          color: colors.text,
          fontFamily: appFont,
          padding: "24px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "380px",
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: "24px",
            padding: "24px",
            boxSizing: "border-box",
            boxShadow: isLight
              ? "0 18px 36px rgba(17, 24, 39, 0.08)"
              : "0 18px 36px rgba(0, 0, 0, 0.26)"
          }}
        >
          <div style={{ fontSize: "28px", fontWeight: 700 }}>
            {authStep === "request" ? "Entra in campo" : "Inserisci il codice"}
          </div>
          <div
            style={{
              marginTop: "8px",
              color: colors.subtext,
              fontSize: "14px",
              lineHeight: 1.5
            }}
          >
            {authStep === "request"
              ? "La tua partita inizia qui"
              : "Controlla la tua email e inserisci il codice"}
          </div>

          {authStep === "request" ? (
            <>
              <div style={{ marginTop: "22px" }}>
                <div style={{ fontSize: "14px", marginBottom: "8px" }}>Giocatore</div>
                <input
                  type="text"
                  name="firstName"
                  autoComplete="given-name"
                  value={authForm.firstName}
                  onChange={(e) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      firstName: e.target.value
                    }))
                  }
                  placeholder="Il tuo nome sullo scorecard"
                  style={{
                    width: "100%",
                    padding: "13px 14px",
                    backgroundColor: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "12px",
                    color: colors.text,
                    boxSizing: "border-box",
                    outline: "none",
                    fontSize: "15px",
                    fontFamily: appFont
                  }}
                />
              </div>

              <div style={{ marginTop: "14px" }}>
                <div style={{ fontSize: "14px", marginBottom: "8px" }}>HCP</div>
                <input
                  type="text"
                  name="hcp"
                  autoComplete="off"
                  inputMode="decimal"
                  value={authForm.hcp}
                  onChange={(e) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      hcp: e.target.value
                    }))
                  }
                  placeholder="Es. 36"
                  style={{
                    width: "100%",
                    padding: "13px 14px",
                    backgroundColor: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "12px",
                    color: colors.text,
                    boxSizing: "border-box",
                    outline: "none",
                    fontSize: "15px",
                    fontFamily: appFont
                  }}
                />
              </div>

              <div style={{ marginTop: "14px", marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", marginBottom: "8px" }}>Email</div>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={authForm.email}
                  onChange={(e) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      email: e.target.value
                    }))
                  }
                  placeholder="nome@email.com"
                  style={{
                    width: "100%",
                    padding: "13px 14px",
                    backgroundColor: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "12px",
                    color: colors.text,
                    boxSizing: "border-box",
                    outline: "none",
                    fontSize: "15px",
                    fontFamily: appFont
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: "22px", marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", marginBottom: "8px" }}>Codice</div>
                <input
                  type="text"
                  name="otpCode"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Es. 123456"
                  style={{
                    width: "100%",
                    padding: "13px 14px",
                    backgroundColor: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "12px",
                    color: colors.text,
                    boxSizing: "border-box",
                    outline: "none",
                    fontSize: "15px",
                    fontFamily: appFont
                  }}
                />
              </div>
            </>
          )}

          {authError && (
            <div
              style={{
                marginTop: "14px",
                color: "#d64545",
                fontSize: "13px",
                lineHeight: 1.5
              }}
            >
              {authError}
            </div>
          )}

          {authMessage && (
            <div
              style={{
                marginTop: "14px",
                color: colors.green,
                fontSize: "13px",
                lineHeight: 1.5
              }}
            >
              {authMessage}
            </div>
          )}

          {authStep === "request" ? (
            <button onClick={handleAuthSubmit} style={primaryButtonStyle(true)}>
              {authSubmitting ? "Invio in corso..." : "Inizia il giro"}
            </button>
          ) : (
            <>
              <button onClick={handleVerifyOtp} style={primaryButtonStyle(true)}>
                {authSubmitting ? "Verifica in corso..." : "Entra nel giro"}
              </button>

              <button onClick={handleResendOtp} style={secondaryButtonStyle}>
                Invia di nuovo il codice
              </button>
            </>
          )}

          <div
            style={{
              marginTop: "10px",
              color: colors.subtext,
              fontSize: "13px",
              lineHeight: 1.5,
              textAlign: "center"
            }}
          >
            Riceverai un codice di accesso solo la prima volta e poi resterai connesso
          </div>
        </div>
      </div>
    );
  }

  const homeHeaderStyle = {
    display: "grid",
    gridTemplateColumns: `${HEADER_CIRCLE_SIZE} 1fr ${HEADER_CIRCLE_SIZE}`,
    alignItems: "center",
    columnGap: "12px",
    paddingLeft: HEADER_HORIZONTAL_INSET,
    paddingRight: HEADER_HORIZONTAL_INSET,
    paddingTop: "10px",
    paddingBottom: "12px",
    marginBottom: "14px"
  };

  const centeredHeaderStyle = {
    display: "grid",
    gridTemplateColumns: `${HEADER_CIRCLE_SIZE} 1fr ${HEADER_CIRCLE_SIZE}`,
    alignItems: "center",
    columnGap: "12px",
    paddingLeft: HEADER_HORIZONTAL_INSET,
    paddingRight: HEADER_HORIZONTAL_INSET,
    paddingTop: "10px",
    paddingBottom: "12px",
    marginBottom: "18px"
  };

  const headerCircleButtonBaseStyle = {
    width: HEADER_CIRCLE_SIZE,
    height: HEADER_CIRCLE_SIZE,
    borderRadius: HEADER_CIRCLE_RADIUS,
    backgroundColor: colors.card,
    color: colors.text,
    cursor: "pointer",
    fontFamily: appFont,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    lineHeight: 1,
    flexShrink: 0,
    boxSizing: "border-box",
    boxShadow: isLight
      ? "0 8px 20px rgba(17, 24, 39, 0.08)"
      : "0 10px 24px rgba(0, 0, 0, 0.34)"
  };

  const headerCircleButtonStyle = ({
    borderColor = colors.borderStrong,
    fontSize = "22px"
  } = {}) => ({
    ...headerCircleButtonBaseStyle,
    border: `2px solid ${borderColor}`,
    fontSize
  });

  const headerButtonSlotBaseStyle = {
    width: HEADER_CIRCLE_SIZE,
    height: HEADER_CIRCLE_SIZE,
    display: "flex",
    alignItems: "center"
  };

  const headerLeftButtonWrapStyle = {
    ...headerButtonSlotBaseStyle,
    justifySelf: "start",
    justifyContent: "flex-start",
    alignSelf: "center"
  };

  const headerRightButtonWrapStyle = {
    ...headerButtonSlotBaseStyle,
    justifySelf: "end",
    justifyContent: "flex-end",
    alignSelf: "center"
  };

  const cardFavoriteIconStyle = (isFav) => ({
    width: CARD_FAVORITE_SIZE,
    height: CARD_FAVORITE_SIZE,
    borderRadius: CARD_FAVORITE_RADIUS,
    border: `2px solid ${isFav ? colors.green : colors.borderStrong}`,
    backgroundColor: colors.card,
    color: colors.text,
    cursor: "pointer",
    fontFamily: appFont,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    lineHeight: 1,
    flexShrink: 0,
    boxSizing: "border-box",
    boxShadow: isLight
      ? "0 4px 12px rgba(17, 24, 39, 0.05)"
      : "0 6px 16px rgba(0, 0, 0, 0.24)"
  });

  const headerTitleTextStyle = {
    fontSize: "17px",
    fontWeight: 700,
    letterSpacing: "0.01em",
    color: colors.text,
    textAlign: "center"
  };

  const homeIdentityRowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: "10px",
    minWidth: 0,
    marginLeft: HOME_SECTION_INSET,
    marginRight: HOME_SECTION_INSET,
    marginBottom: "26px"
  };

  const homeHeaderIdentityStyle = {
    minWidth: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "10px",
    justifyContent: "center",
    lineHeight: 1.1
  };

  const homeHcpPillStyle = {
    border: `1px solid ${colors.pillBorder}`,
    backgroundColor: colors.pillBg,
    color: colors.subtext,
    borderRadius: "999px",
    padding: "6px 11px",
    fontSize: "12px",
    fontFamily: appFont,
    cursor: "pointer",
    lineHeight: 1.2,
    whiteSpace: "nowrap"
  };

  const getHcpValueFeedbackStyle = (active, baseColor = colors.text) => ({
    display: "inline-block",
    color: active ? colors.green : baseColor,
    opacity: active ? 0.92 : 1,
    transform: active ? "scale(1.04)" : "scale(1)",
    transition:
      "color 0.28s ease-in-out, opacity 0.28s ease-in-out, transform 0.28s ease-in-out"
  });

  const homeNameButtonStyle = {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    color: colors.text,
    fontFamily: appFont,
    cursor: "pointer",
    textAlign: "left",
    minWidth: 0
  };

  const cardStyle = {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    padding: CARD_CONTAINER_HORIZONTAL_PADDING
  };

  const homeSectionCardStyle = {
    ...cardStyle,
    marginLeft: HOME_SECTION_INSET,
    marginRight: HOME_SECTION_INSET
  };

  const homeSectionTitleStyle = {
    ...titleStyle,
    marginTop: "28px",
    marginBottom: "14px",
    marginLeft: HOME_SECTION_INSET,
    marginRight: HOME_SECTION_INSET
  };

  const homeSearchInnerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: "14px",
    padding: "12px 14px",
    marginLeft: "2px",
    marginRight: "2px"
  };

  const homeSearchEmptyStateStyle = {
    marginTop: "12px",
    padding: "12px 4px 2px 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px"
  };

  const homeSearchEmptyTextStyle = {
    color: colors.subtext,
    lineHeight: 1.45,
    minWidth: 0
  };

  const homeSearchEmptyCtaStyle = {
    border: "none",
    background: "transparent",
    color: colors.green,
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: appFont,
    cursor: "pointer",
    padding: 0,
    whiteSpace: "nowrap",
    flexShrink: 0
  };

  const homePrimarySectionCardStyle = {
    ...homeSectionCardStyle,
    paddingTop: "6px",
    paddingBottom: "6px",
    boxShadow: isLight
      ? "0 8px 24px rgba(17, 24, 39, 0.04)"
      : "0 10px 24px rgba(0, 0, 0, 0.16)"
  };

  const scorecardTopCardStyle = {
    padding: "18px",
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    boxShadow: isLight
      ? "0 6px 18px rgba(17, 24, 39, 0.04)"
      : "0 8px 20px rgba(0, 0, 0, 0.18)"
  };

  const scorecardSummaryCardStyle = {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    padding: "18px",
    boxShadow: isLight
      ? "0 4px 14px rgba(17, 24, 39, 0.03)"
      : "0 6px 16px rgba(0, 0, 0, 0.14)"
  };

  const scorecardHoleCardStyle = {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    padding: "18px",
    marginTop: "14px",
    boxShadow: isLight
      ? "0 5px 16px rgba(17, 24, 39, 0.035)"
      : "0 7px 18px rgba(0, 0, 0, 0.14)"
  };

  const roundSetupTopCardStyle = {
    padding: "20px",
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "20px",
    boxShadow: isLight
      ? "0 6px 18px rgba(17, 24, 39, 0.04)"
      : "0 8px 20px rgba(0, 0, 0, 0.18)"
  };

  const roundSetupInputCardStyle = {
    ...cardStyle,
    padding: "16px",
    borderRadius: "18px",
    boxShadow: isLight
      ? "0 4px 14px rgba(17, 24, 39, 0.03)"
      : "0 6px 16px rgba(0, 0, 0, 0.12)"
  };

  const roundSetupSectionTitleStyle = {
    ...titleStyle,
    marginTop: "24px",
    marginBottom: "12px"
  };

  const roundSetupGridStyle = {
    display: "grid",
    gap: "12px"
  };

  const roundSetupPreviewStyle = {
    marginTop: "20px",
    backgroundColor: colors.card,
    border: `1px solid ${colors.greenBorder}`,
    borderRadius: "16px",
    padding: "18px",
    boxShadow: isLight
      ? "0 4px 14px rgba(17, 24, 39, 0.03)"
      : "0 6px 16px rgba(0, 0, 0, 0.12)"
  };

  const setupCardOptionStyle = (active) => ({
    padding: "18px 16px",
    borderRadius: "14px",
    border: active ? `1px solid ${colors.green}` : `1px solid ${colors.borderStrong}`,
    backgroundColor: active ? colors.greenDark : colors.inputBg,
    cursor: "pointer",
    fontWeight: 600,
    textAlign: "center",
    color: colors.text,
    boxShadow: active
      ? isLight
        ? "0 6px 16px rgba(46, 204, 113, 0.14)"
        : "0 8px 18px rgba(0, 0, 0, 0.2)"
      : "none"
  });

  const renderCourseRow = (course, { showDivider = true } = {}) => (
    <div
      key={course.id}
      onClick={() => prepareRoundSetup(course)}
      onMouseDown={() => setActiveCourseCardId(course.id)}
      onMouseUp={() => setActiveCourseCardId(null)}
      onMouseLeave={() => setActiveCourseCardId(null)}
      onTouchStart={() => setActiveCourseCardId(course.id)}
      onTouchEnd={() => setActiveCourseCardId(null)}
      onTouchCancel={() => setActiveCourseCardId(null)}
      style={{
        padding: `14px ${CARD_ROW_HORIZONTAL_PADDING}`,
        borderBottom: showDivider ? `1px solid ${colors.border}` : "none",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        fontFamily: appFont,
        cursor: "pointer",
        borderRadius: "14px",
        backgroundColor:
          activeCourseCardId === course.id ? colors.cardSecondary : "transparent",
        transform: activeCourseCardId === course.id ? "scale(0.992)" : "scale(1)",
        transition: "background-color 0.18s ease, transform 0.18s ease"
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "16px", fontWeight: 500 }}>{course.name}</div>
        <div
          style={{
            color: colors.subtext,
            fontSize: "13px",
            marginTop: "3px"
          }}
        >
          {course.holesCount} buche • Par {course.totalPar}
        </div>
      </div>

      <div
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(course.id);
        }}
        style={cardFavoriteIconStyle(course.favorite)}
        title="Preferito"
      >
        <span style={{ fontSize: "17px", lineHeight: 1, transform: "translateY(-1px)" }}>
          ⛳️
        </span>
      </div>
    </div>
  );

  if (openedCourse && showRoundSetup) {
    const allowedCompetitionOptions =
      openedCourse.holesCount === 18 ? [18, 36, 54] : [9, 18, 27, 36, 45, 54];

    const allowedStartHoles = Array.from(
      { length: openedCourse.holesCount },
      (_, index) => index + 1
    );

    return (
      <div
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          minHeight: "100vh",
          padding: `20px ${SCREEN_HORIZONTAL_PADDING}`,
          boxSizing: "border-box",
          fontFamily: appFont
        }}
      >
        {topSafeAreaBackdrop}

        <div style={centeredHeaderStyle}>
          <div style={headerLeftButtonWrapStyle}>
            <button
              onClick={closeCourse}
              style={headerCircleButtonStyle()}
              aria-label="Torna indietro"
            >
              <span
                style={{ fontSize: "21px", lineHeight: 1, transform: "translateX(-1px)" }}
              >
                ←
              </span>
            </button>
          </div>

          <div style={headerTitleTextStyle}>Imposta il giro</div>

          <div style={headerRightButtonWrapStyle}>
            <button
              onClick={() => {
                setSheetClosing(false);
                setActiveSheet("menu");
              }}
              style={headerCircleButtonStyle({ fontSize: "18px" })}
              title="Apri menu"
              aria-label="Apri menu"
            >
              <span
                style={{ fontSize: "18px", lineHeight: 1, transform: "translateY(-1px)" }}
              >
                ≡
              </span>
            </button>
          </div>
        </div>

        <div style={roundSetupTopCardStyle}>
          <div style={{ fontSize: "25px", fontWeight: 700 }}>
            {openedCourse.name}
          </div>

          <div
            style={{
              marginTop: "10px",
              color: colors.subtext,
              fontSize: "14px",
              lineHeight: 1.5
            }}
          >
            Campo da {openedCourse.holesCount} buche
          </div>
        </div>

        <h2 style={roundSetupSectionTitleStyle}>Nome gara</h2>
        <div style={roundSetupInputCardStyle}>
          <input
            type="text"
            value={roundSetup.competitionName}
            onChange={(e) =>
              setRoundSetup((prev) => ({
                ...prev,
                competitionName: e.target.value
              }))
            }
            placeholder="Es. Stableford sabato, Allenamento"
            style={{
              width: "100%",
              padding: "13px 14px",
              backgroundColor: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: "12px",
              color: colors.text,
              boxSizing: "border-box",
              outline: "none",
              fontSize: "15px",
              fontFamily: appFont
            }}
          />
        </div>

        <h2 style={roundSetupSectionTitleStyle}>Buche di gara</h2>
        <div
          style={{
            ...roundSetupGridStyle,
            gridTemplateColumns: "repeat(3, 1fr)"
          }}
        >
          {allowedCompetitionOptions.map((option) => (
            <div
              key={option}
              onClick={() =>
                setRoundSetup((prev) => ({
                  ...prev,
                  totalCompetitionHoles: option
                }))
              }
              style={setupCardOptionStyle(
                roundSetup.totalCompetitionHoles === option
              )}
            >
              {option}
            </div>
          ))}
        </div>

        <h2 style={roundSetupSectionTitleStyle}>Buca di partenza</h2>
        <div
          style={{
            ...roundSetupGridStyle,
            gridTemplateColumns:
              openedCourse.holesCount === 18 ? "repeat(6, 1fr)" : "repeat(3, 1fr)"
          }}
        >
          {allowedStartHoles.map((holeNumber) => (
            <div
              key={holeNumber}
              onClick={() =>
                setRoundSetup((prev) => ({
                  ...prev,
                  startHole: holeNumber
                }))
              }
              style={setupCardOptionStyle(roundSetup.startHole === holeNumber)}
            >
              {holeNumber}
            </div>
          ))}
        </div>

        <div style={roundSetupPreviewStyle}>
          <div style={{ color: colors.subtext, fontSize: "13px" }}>Anteprima</div>
          <div style={{ marginTop: "10px", fontSize: "17px", fontWeight: 700 }}>
            {roundSetup.totalCompetitionHoles} buche • partenza dalla {roundSetup.startHole}
          </div>
          <div
            style={{
              marginTop: "10px",
              color: colors.subtext,
              fontSize: "13px",
              lineHeight: 1.5
            }}
          >
            Il sistema calcolerà automaticamente i giri e mostrerà per ogni buca
            il riferimento reale del campo.
          </div>
        </div>

        <button onClick={startRound} style={primaryButtonStyle(true)}>
          Inizia giro
        </button>

        {overlayPortal}
      </div>
    );
  }

  if (openedCourse && !showRoundSetup) {
    return (
      <div
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          minHeight: "100vh",
          padding: `20px ${SCREEN_HORIZONTAL_PADDING}`,
          boxSizing: "border-box",
          fontFamily: appFont
        }}
      >
        {topSafeAreaBackdrop}

        <div style={centeredHeaderStyle}>
          <div style={headerLeftButtonWrapStyle}>
            <button
              onClick={closeCourse}
              style={headerCircleButtonStyle()}
              aria-label="Torna alla home"
            >
              <span
                style={{ fontSize: "21px", lineHeight: 1, transform: "translateX(-1px)" }}
              >
                ←
              </span>
            </button>
          </div>

          <div style={headerTitleTextStyle}>Scorecard</div>

          <div style={headerRightButtonWrapStyle}>
            <button
              onClick={() => {
                setSheetClosing(false);
                setActiveSheet("menu");
              }}
              style={headerCircleButtonStyle({ fontSize: "18px" })}
              title="Apri menu"
              aria-label="Apri menu"
            >
              <span
                style={{ fontSize: "18px", lineHeight: 1, transform: "translateY(-1px)" }}
              >
                ≡
              </span>
            </button>
          </div>
        </div>

        <div style={scorecardTopCardStyle}>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>
  {openedCourse.name}
</div>

{roundSetup.competitionName && (
  <div
    style={{
      marginTop: "6px",
      fontSize: "14px",
      color: colors.green,
      fontWeight: 600
    }}
  >
    {roundSetup.competitionName}
  </div>
)}

          <div
            style={{
              marginTop: "10px",
              color: colors.subtext,
              fontSize: "14px",
              lineHeight: 1.5
            }}
          >
            {roundSetup.totalCompetitionHoles} buche • partenza dalla {roundSetup.startHole}
          </div>

          <div
            style={{
              marginTop: "12px",
              color: colors.subtext,
              fontSize: "13px"
            }}
          >
            {userProfile.firstName} • HCP{" "}
            <span style={getHcpValueFeedbackStyle(hcpHighlightActive, colors.subtext)}>
              {userProfile.hcp}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginTop: "18px"
          }}
        >
          <div style={scorecardSummaryCardStyle}>
            <div style={{ color: colors.subtext, fontSize: "13px" }}>Lordo</div>
            <div style={{ marginTop: "6px", fontSize: "26px", fontWeight: 700 }}>
              {grossTotal}
            </div>
          </div>

          <div style={scorecardSummaryCardStyle}>
            <div style={{ color: colors.subtext, fontSize: "13px" }}>Stableford</div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "26px",
                fontWeight: 700,
                color: colors.green
              }}
            >
              {stablefordTotal}
            </div>
          </div>
        </div>

        <div
          style={{
            ...scorecardSummaryCardStyle,
            marginTop: "12px"
          }}
        >
          <div style={{ color: colors.subtext, fontSize: "13px" }}>
            HCP stimato dopo il giro
          </div>
          <div
            style={{
              marginTop: "6px",
              fontSize: "24px",
              fontWeight: 700,
              color: colors.green
            }}
          >
            <span style={getHcpValueFeedbackStyle(estimatedHcpHighlightActive, colors.green)}>
              {estimatedHcpAfterRound}
            </span>
          </div>
          <div
            style={{
              marginTop: "8px",
              color: colors.subtext,
              fontSize: "12px",
              lineHeight: 1.5
            }}
          >
            Stima indicativa. L’HCP ufficiale viene calcolato con un algoritmo più
            complesso: attendi dopo le 00:00 del giorno successivo alla gara e
            verifica nell’app FIG.
          </div>
        </div>

        {competitionHoles.length > 0 ? (
          competitionHoles.map((hole, index) => {
            const automaticReceivedShots = getAutomaticReceivedShots(
              userProfile.hcp,
              hole.strokeIndex
            );
            const effectiveReceivedShots = getEffectiveReceivedShots(
              index,
              userProfile.hcp,
              hole.strokeIndex
            );
            const isManual = manualReceivedShots[index] !== undefined;
            const stablefordPoints = getStablefordPoints(
              hole.par,
              roundScores[index],
              effectiveReceivedShots
            );

            return (
              <div
                key={`${hole.competitionHoleNumber}-${hole.courseHoleNumber}-${index}`}
                style={scorecardHoleCardStyle}
              >
                <div
                  style={{
                    color: colors.subtext,
                    fontSize: "13px",
                    marginBottom: "8px"
                  }}
                >
                  Giro {hole.roundNumber} di {hole.totalRounds}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "20px", fontWeight: 700 }}>
                      Buca {hole.competitionHoleNumber}
                    </div>
                    <div
                      style={{
                        marginTop: "6px",
                        color: colors.subtext,
                        fontSize: "14px"
                      }}
                    >
                      ⛳️ {hole.courseHoleNumber}
                    </div>
                  </div>

                  <div
                    style={{
                      color: colors.green,
                      fontSize: "14px",
                      fontWeight: 700
                    }}
                  >
                    {stablefordPoints} pt
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginTop: "14px"
                  }}
                >
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      backgroundColor: colors.pillBg,
                      border: `1px solid ${colors.pillBorder}`,
                      color: colors.text,
                      fontSize: "13px"
                    }}
                  >
                    Par {hole.par}
                  </div>

                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      backgroundColor: colors.pillBg,
                      border: `1px solid ${colors.pillBorder}`,
                      color: colors.text,
                      fontSize: "13px"
                    }}
                  >
                    SI {hole.strokeIndex}
                  </div>

                  <button
                    onClick={() =>
                      cycleReceivedShotsValue(index, automaticReceivedShots)
                    }
                    style={{
                      minWidth: "56px",
                      padding: "8px 12px",
                      borderRadius: "999px",
                      backgroundColor: isManual
                        ? colors.greenManualBg
                        : colors.greenDark,
                      border: isManual
                        ? `1px solid ${colors.greenManualBorder}`
                        : `1px solid ${colors.greenBorder}`,
                      color: colors.green,
                      fontSize: "13px",
                      cursor: "pointer",
                      fontFamily: appFont,
                      fontWeight: 600
                    }}
                  >
                    {receivedShotsToSymbols(effectiveReceivedShots)}
                  </button>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div
                    style={{
                      color: colors.subtext,
                      fontSize: "13px",
                      marginBottom: "10px"
                    }}
                  >
                    Colpi fatti
                  </div>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: "10px" }}
                  >
                    <button
                      onClick={() => adjustRoundScore(index, -1)}
                      style={themedStepperButtonStyle}
                    >
                      -
                    </button>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={roundScores[index]}
                      onChange={(e) => handleScoreInputChange(index, e.target.value)}
                      onBlur={() => normalizeScoreInput(index)}
                      placeholder="0"
                      style={stepperInputStyle}
                    />

                    <button
                      onClick={() => adjustRoundScore(index, 1)}
                      style={themedStepperButtonStyle}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              color: colors.subtext,
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: "14px",
              padding: "18px",
              marginTop: "14px"
            }}
          >
            Per questo campo non c’è ancora una mappatura completa.
          </div>
        )}

        <button
          onClick={saveRound}
          disabled={roundAlreadySaved}
          style={primaryButtonStyle(!roundAlreadySaved)}
        >
          {roundAlreadySaved ? "Giro salvato" : "Salva giro"}
        </button>

        {showRoundsHistory && (
          <div style={{ marginTop: "14px" }}>
            <h2 style={{ ...titleStyle, marginTop: "0" }}>Storico</h2>

            {roundsForOpenedCourse.length === 0 ? (
              <div
                style={{
                  color: colors.subtext,
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "14px",
                  padding: "18px"
                }}
              >
                Nessun giro salvato per questo campo.
              </div>
            ) : (
              roundsForOpenedCourse.map((round) => (
                <div
                  key={round.id}
                  style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "16px",
                    padding: "18px",
                    marginBottom: "12px"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      marginBottom: "6px"
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>
                      {round.savedName}
                    </div>
                    <button
                      onClick={() => deleteRound(round.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: colors.subtext,
                        cursor: "pointer",
                        fontFamily: appFont,
                        fontSize: "12px",
                        padding: 0
                      }}
                    >
                      Elimina
                    </button>
                  </div>

                  <div
                    style={{
                      color: colors.subtext,
                      fontSize: "12px"
                    }}
                  >
                    {round.formattedDate}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginTop: "12px"
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: colors.pillBg,
                        border: `1px solid ${colors.pillBorder}`,
                        fontSize: "13px"
                      }}
                    >
                      Lordo {round.grossTotal}
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: colors.pillBg,
                        border: `1px solid ${colors.pillBorder}`,
                        fontSize: "13px"
                      }}
                    >
                      Netto {round.netTotal}
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: colors.greenDark,
                        border: `1px solid ${colors.greenBorder}`,
                        color: colors.green,
                        fontSize: "13px"
                      }}
                    >
                      Stableford {round.stablefordTotal}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      color: colors.subtext,
                      fontSize: "12px"
                    }}
                  >
                    HCP stimato {round.estimatedHcpAfterRound}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {overlayPortal}

      </div>
    );
  }

  if (showPrivacyScreen) {
    return (
      <div
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          minHeight: "100vh",
          padding: `20px ${SCREEN_HORIZONTAL_PADDING}`,
          boxSizing: "border-box",
          fontFamily: appFont
        }}
      >
        {topSafeAreaBackdrop}

        <div style={centeredHeaderStyle}>
          <div style={headerLeftButtonWrapStyle}>
            <button
              onClick={() => setShowPrivacyScreen(false)}
              style={headerCircleButtonStyle()}
              aria-label="Torna indietro"
            >
              <span
                style={{ fontSize: "21px", lineHeight: 1, transform: "translateX(-1px)" }}
              >
                ←
              </span>
            </button>
          </div>

          <div style={headerTitleTextStyle}>Privacy</div>

          <div style={headerRightButtonWrapStyle}>
            <button
              onClick={() => {
                setSheetClosing(false);
                setActiveSheet("menu");
              }}
              style={headerCircleButtonStyle({ fontSize: "18px" })}
              title="Apri menu"
              aria-label="Apri menu"
            >
              <span
                style={{ fontSize: "18px", lineHeight: 1, transform: "translateY(-1px)" }}
              >
                ≡
              </span>
            </button>
          </div>
        </div>

        <div
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: "20px",
            padding: "22px 20px",
            lineHeight: 1.6
          }}
        >
          <div style={{ fontSize: "28px", fontWeight: 700, marginBottom: "18px" }}>
            Privacy
          </div>

          <p style={{ margin: "0 0 18px 0", color: colors.subtext }}>
            Raccogliamo solo le informazioni necessarie per far funzionare l’app.
          </p>

          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>
            Dati utilizzati
          </div>
          <p style={{ margin: "0 0 8px 0", color: colors.subtext }}>
            - Email per l’accesso.
          </p>
          <p style={{ margin: "0 0 8px 0", color: colors.subtext }}>
            - Nome giocatore e HCP per gestire i tuoi giri.
          </p>
          <p style={{ margin: "0 0 18px 0", color: colors.subtext }}>
            - Dati dei giri salvati nel tuo account.
          </p>

          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>
            Come usiamo i dati
          </div>
          <p style={{ margin: "0 0 8px 0", color: colors.subtext }}>
            I dati vengono utilizzati solo per:
          </p>
          <p style={{ margin: "0 0 8px 0", color: colors.subtext }}>
            - permetterti di accedere,
          </p>
          <p style={{ margin: "0 0 8px 0", color: colors.subtext }}>
            - salvare i tuoi giri,
          </p>
          <p style={{ margin: "0 0 18px 0", color: colors.subtext }}>
            - migliorare l’esperienza di gioco.
          </p>

          <p style={{ margin: "0 0 18px 0", color: colors.subtext }}>
            Non vendiamo né condividiamo i tuoi dati con terze parti.
          </p>

          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>
            Accesso e controllo
          </div>
          <p style={{ margin: "0 0 18px 0", color: colors.subtext }}>
            Puoi modificare i tuoi dati in qualsiasi momento dalla sezione Giocatore.
          </p>

          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>
            Contatto
          </div>
          <p style={{ margin: 0, color: colors.subtext }}>
            Per qualsiasi domanda puoi contattarci via email.
          </p>
        </div>

        {overlayPortal}
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        minHeight: "100vh",
        padding: `20px ${SCREEN_HORIZONTAL_PADDING}`,
        boxSizing: "border-box",
        fontFamily: appFont
      }}
    >
      {topSafeAreaBackdrop}

      <div style={homeHeaderStyle}>
        <div style={headerLeftButtonWrapStyle}>
          <button
            onClick={openDialog}
            style={{
              ...headerCircleButtonStyle({
                borderColor: colors.green,
                fontSize: "24px"
              }),
              boxShadow: searchEmptyHintPulse
                ? isLight
                  ? "0 0 0 6px rgba(46, 204, 113, 0.10), 0 8px 20px rgba(17, 24, 39, 0.08)"
                  : "0 0 0 6px rgba(46, 204, 113, 0.12), 0 10px 24px rgba(0, 0, 0, 0.34)"
                : headerCircleButtonBaseStyle.boxShadow,
              transform: searchEmptyHintPulse ? "scale(1.04)" : "scale(1)",
              transition: "transform 0.35s ease, box-shadow 0.35s ease"
            }}
            aria-label="Aggiungi campo"
          >
            <span style={{ fontSize: "24px", lineHeight: 1, transform: "translateY(-1px)" }}>
              +
            </span>
          </button>
        </div>

        <div aria-hidden="true" />

        <div style={headerRightButtonWrapStyle}>
          <button
            onClick={() => {
              setSheetClosing(false);
              setActiveSheet("menu");
            }}
            style={headerCircleButtonStyle({ fontSize: "18px" })}
            title="Apri menu"
            aria-label="Apri menu"
          >
            <span
              style={{ fontSize: "18px", lineHeight: 1, transform: "translateY(-1px)" }}
            >
              ≡
            </span>
          </button>
        </div>
      </div>

      <div style={homeIdentityRowStyle}>
        <div style={homeHeaderIdentityStyle}>
          <button onClick={openHcpEditor} style={homeNameButtonStyle} title={userProfile.firstName}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: colors.text,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {userProfile.firstName}
            </div>
          </button>
        </div>

        <button onClick={openHcpEditor} style={homeHcpPillStyle}>
          HCP{" "}
          <span style={getHcpValueFeedbackStyle(hcpHighlightActive, colors.subtext)}>
            {userProfile.hcp}
          </span>
        </button>
      </div>

      <h2 style={homeSectionTitleStyle}>Preferiti</h2>
      <div style={homePrimarySectionCardStyle}>
        {favorites.length === 0 ? (
          <div
            style={{
              color: colors.subtext,
              lineHeight: 1.6,
              padding: `14px ${CARD_ROW_HORIZONTAL_PADDING}`
            }}
          >
            Nessun preferito salvato. Usa il pulsante + per aggiungere un campo e ritrovarlo subito qui.
          </div>
        ) : (
          favorites.map((course) => renderCourseRow(course, { showDivider: false }))
        )}
      </div>

      <h2 style={homeSectionTitleStyle}>Cerca un campo</h2>
      <div style={homeSectionCardStyle}>
        <div
          style={homeSearchInnerStyle}
        >
          <div style={{ color: colors.subtext, fontSize: "16px" }}>⌕</div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca o aggiungi un campo"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: colors.text,
              fontSize: "15px",
              fontFamily: appFont
            }}
          />
        </div>

        {searchQuery.trim() !== "" && (
          <div style={{ marginTop: "12px" }}>
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => renderCourseRow(course))
            ) : (
              <div style={homeSearchEmptyStateStyle}>
                <div style={homeSearchEmptyTextStyle}>
                  <div>Campo non trovato</div>
                </div>

                <button onClick={openDialog} style={homeSearchEmptyCtaStyle}>
                  Aggiungi campo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {overlayPortal}

      {showDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: colors.overlay,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            boxSizing: "border-box",
            zIndex: 30
          }}
        >
          <div
            style={{
              backgroundColor: colors.card,
              padding: "18px",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "390px",
              maxHeight: "90vh",
              overflowY: "auto",
              border: `1px solid ${colors.border}`,
              boxSizing: "border-box",
              fontFamily: appFont
            }}
          >
            {dialogStep === 1 && (
              <>
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "8px",
                    fontSize: "24px",
                    fontWeight: 700
                  }}
                >
                  Aggiungi campo
                </h3>

                <p
                  style={{
                    color: colors.subtext,
                    fontSize: "14px",
                    marginTop: 0,
                    marginBottom: "16px",
                    lineHeight: 1.4
                  }}
                >
                  Inserisci il nome del campo.
                </p>

                <input
                  type="text"
                  placeholder="Nome campo"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "13px 14px",
                    backgroundColor: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "12px",
                    color: colors.text,
                    boxSizing: "border-box",
                    outline: "none",
                    fontSize: "15px",
                    fontFamily: appFont
                  }}
                />

                <button
                  onClick={goToStepTwo}
                  disabled={courseName.trim() === ""}
                  style={primaryButtonStyle(courseName.trim() !== "")}
                >
                  Continua
                </button>

                <button onClick={closeDialog} style={secondaryButtonStyle}>
                  Annulla
                </button>
              </>
            )}

            {dialogStep === 2 && (
              <>
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "8px",
                    fontSize: "24px",
                    fontWeight: 700
                  }}
                >
                  Numero buche
                </h3>

                <p
                  style={{
                    color: colors.subtext,
                    fontSize: "14px",
                    marginTop: 0,
                    marginBottom: "20px",
                    lineHeight: 1.4
                  }}
                >
                  Seleziona il numero di buche
                </p>

                <div style={{ display: "flex", gap: "12px" }}>
                  <div
                    onClick={() => setHolesCount(9)}
                    style={{
                      flex: 1,
                      padding: "16px",
                      backgroundColor: colors.inputBg,
                      border:
                        holesCount === 9
                          ? `1px solid ${colors.green}`
                          : `1px solid ${colors.inputBorder}`,
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "16px" }}>9</span>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border:
                          holesCount === 9
                            ? `2px solid ${colors.green}`
                            : `2px solid ${colors.borderStrong}`,
                        backgroundColor:
                          holesCount === 9 ? colors.green : "transparent"
                      }}
                    />
                  </div>

                  <div
                    onClick={() => setHolesCount(18)}
                    style={{
                      flex: 1,
                      padding: "16px",
                      backgroundColor: colors.inputBg,
                      border:
                        holesCount === 18
                          ? `1px solid ${colors.green}`
                          : `1px solid ${colors.inputBorder}`,
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "16px" }}>18</span>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border:
                          holesCount === 18
                            ? `2px solid ${colors.green}`
                            : `2px solid ${colors.borderStrong}`,
                        backgroundColor:
                          holesCount === 18 ? colors.green : "transparent"
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={goToIntroStep}
                  disabled={!holesCount}
                  style={primaryButtonStyle(Boolean(holesCount))}
                >
                  Continua
                </button>

                <button onClick={goBackToStepOne} style={secondaryButtonStyle}>
                  Indietro
                </button>

                <button onClick={closeDialog} style={subtleButtonStyle}>
                  Annulla
                </button>
              </>
            )}

            {dialogStep === 3 && (
              <>
                <div
                  style={{
                    width: "70px",
                    height: "70px",
                    borderRadius: "35px",
                    backgroundColor: colors.greenDark,
                    border: `1px solid ${colors.greenBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    margin: "0 auto 18px auto"
                  }}
                >
                  ⛳️
                </div>

                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "10px",
                    fontSize: "24px",
                    fontWeight: 700,
                    textAlign: "center"
                  }}
                >
                  Bene!
                </h3>

                <p
                  style={{
                    color: colors.subtext,
                    fontSize: "15px",
                    marginTop: 0,
                    marginBottom: "10px",
                    lineHeight: 1.5,
                    textAlign: "center"
                  }}
                >
                  Ora mappiamo il campo buca per buca.
                </p>

                <p
                  style={{
                    color: colors.subtext,
                    fontSize: "14px",
                    marginTop: 0,
                    marginBottom: "18px",
                    lineHeight: 1.5,
                    textAlign: "center"
                  }}
                >
                  Alla fine vedrai il riepilogo completo con il Par del campo e
                  su quali buche riceverai più colpi in base al tuo HCP di gioco.
                </p>

                <button onClick={startMapping} style={primaryButtonStyle(true)}>
                  Inizia
                </button>

                <button
                  onClick={goBackToStepTwoFromIntro}
                  style={secondaryButtonStyle}
                >
                  Indietro
                </button>

                <button onClick={closeDialog} style={subtleButtonStyle}>
                  Annulla
                </button>
              </>
            )}

            {dialogStep === 4 && (
              <>
                <div
                  style={{
                    color: colors.subtext,
                    fontSize: "13px",
                    marginBottom: "10px"
                  }}
                >
                  Buca {currentHoleIndex + 1} di {holesCount}
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    backgroundColor: colors.cardSecondary,
                    borderRadius: "999px",
                    overflow: "hidden",
                    marginBottom: "20px"
                  }}
                >
                  <div
                    style={{
                      width: `${((currentHoleIndex + 1) / holesCount) * 100}%`,
                      height: "100%",
                      backgroundColor: colors.green,
                      transition: "width 0.25s ease"
                    }}
                  />
                </div>

                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "8px",
                    fontSize: "24px",
                    fontWeight: 700
                  }}
                >
                  Buca {currentHole.hole}
                </h3>

                <p
                  style={{
                    color: colors.subtext,
                    fontSize: "14px",
                    marginTop: 0,
                    marginBottom: "18px",
                    lineHeight: 1.5
                  }}
                >
                  Inserisci il Par e lo Stroke Index.
                </p>

                <div
                  onClick={() => setSelectedStepper("par")}
                  style={stepperCardStyle(selectedStepper === "par")}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      color: colors.subtext,
                      marginBottom: "8px"
                    }}
                  >
                    Par
                  </label>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: "10px" }}
                  >
                    <button
                      onClick={() => adjustPar(-1)}
                      style={themedStepperButtonStyle}
                    >
                      -
                    </button>

                    <div style={stepperValueStyle}>{currentHole.par}</div>

                    <button
                      onClick={() => adjustPar(1)}
                      style={themedStepperButtonStyle}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedStepper("stroke")}
                  style={stepperCardStyle(selectedStepper === "stroke")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "8px"
                    }}
                  >
                    <label style={{ fontSize: "14px", color: colors.subtext }}>
                      Stroke Index
                    </label>

                    {currentHoleIndex === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowStrokeInfo((prev) => !prev);
                        }}
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: `1px solid ${colors.borderStrong}`,
                          backgroundColor: colors.inputBg,
                          color: colors.subtext,
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          fontFamily: appFont
                        }}
                      >
                        i
                      </button>
                    )}
                  </div>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: "10px" }}
                  >
                    <button
                      onClick={() => adjustStrokeIndex(-1)}
                      style={themedStepperButtonStyle}
                    >
                      -
                    </button>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={currentHole.strokeIndex}
                      onChange={(e) => handleStrokeInputChange(e.target.value)}
                      onBlur={normalizeStrokeInput}
                      placeholder="0"
                      style={stepperInputStyle}
                    />

                    <button
                      onClick={() => adjustStrokeIndex(1)}
                      style={themedStepperButtonStyle}
                    >
                      +
                    </button>
                  </div>
                </div>

                {currentHoleIndex === 0 && showStrokeInfo && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "14px",
                      backgroundColor: colors.cardSecondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "12px",
                      color: colors.subtext,
                      fontSize: "13px",
                      lineHeight: 1.5
                    }}
                  >
                    Lo Stroke Index serve a determinare su quali buche ricevi più
                    colpi in base al tuo handicap di gioco. Se non conosci questo
                    dato chiedilo alla segreteria del campo.
                  </div>
                )}

                <button
                  onClick={nextHole}
                  disabled={!currentHoleCompleted}
                  style={primaryButtonStyle(currentHoleCompleted)}
                >
                  {currentHoleIndex === holesCount - 1
                    ? "Vai al riepilogo"
                    : "Avanti"}
                </button>

                <button onClick={previousHole} style={secondaryButtonStyle}>
                  {currentHoleIndex === 0 ? "Indietro" : "Buca precedente"}
                </button>

                <button onClick={closeDialog} style={subtleButtonStyle}>
                  Annulla
                </button>
              </>
            )}

            {dialogStep === 5 && (
              <>
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "8px",
                    fontSize: "24px",
                    fontWeight: 700
                  }}
                >
                  Riepilogo campo
                </h3>

                <p
                  style={{
                    color: colors.subtext,
                    fontSize: "14px",
                    marginTop: 0,
                    marginBottom: "18px",
                    lineHeight: 1.5
                  }}
                >
                  Controlla la mappatura completa di {courseName}.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px 1fr 1fr",
                    gap: "10px",
                    marginBottom: "12px",
                    fontSize: "13px",
                    color: colors.subtext,
                    padding: "0 4px"
                  }}
                >
                  <div>Buca</div>
                  <div>Par</div>
                  <div>Stroke Index</div>
                </div>

                {holesData.map((hole) => (
                  <div
                    key={hole.hole}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 1fr 1fr",
                      gap: "10px",
                      alignItems: "center",
                      marginBottom: "10px"
                    }}
                  >
                    <div
                      style={{
                        height: "42px",
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: "10px",
                        borderRadius: "10px",
                        backgroundColor: colors.inputBg,
                        border: `1px solid ${colors.inputBorder}`
                      }}
                    >
                      {hole.hole}
                    </div>

                    <div
                      style={{
                        height: "42px",
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: "12px",
                        borderRadius: "10px",
                        backgroundColor: colors.inputBg,
                        border: `1px solid ${colors.inputBorder}`
                      }}
                    >
                      {hole.par}
                    </div>

                    <div
                      style={{
                        height: "42px",
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: "12px",
                        borderRadius: "10px",
                        backgroundColor: colors.inputBg,
                        border: `1px solid ${colors.inputBorder}`
                      }}
                    >
                      {hole.strokeIndex}
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    marginTop: "18px",
                    padding: "14px 16px",
                    borderRadius: "14px",
                    backgroundColor: colors.cardSecondary,
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                    
                  }}
                >
                  <span style={{ color: colors.text, fontSize: "15px" }}>
                    Par totale campo
                  </span>
                  <span
                    style={{
                      color: colors.green,
                      fontWeight: 700,
                      fontSize: "18px"
                    }}
                  >
                    {totalPar}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    color: colors.subtext,
                    fontSize: "13px",
                    lineHeight: 1.5
                  }}
                >
                  Una volta salvato, il campo resterà nel sistema e potrà essere
                  richiamato senza rimappatura.
                </div>

                <button onClick={saveCourse} style={primaryButtonStyle(true)}>
                  Salva campo
                </button>

                <button onClick={goBackFromSummary} style={secondaryButtonStyle}>
                  Modifica ultima buca
                </button>

                <button onClick={closeDialog} style={subtleButtonStyle}>
                  Annulla
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
