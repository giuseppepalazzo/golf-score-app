import { useEffect, useMemo, useState } from "react";

const appFont =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const STORAGE_KEY = "golf-score-app-courses-v1";
const ROUNDS_STORAGE_KEY = "golf-score-app-rounds-v1";
const USER_PROFILE_STORAGE_KEY = "golf-score-app-user-profile-v1";

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

const stepperValueStyle = {
  flex: 1,
  height: "44px",
  borderRadius: "12px",
  border: "1px solid #333",
  backgroundColor: "#1a1a1a",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: 600,
  fontFamily: appFont
};

const stepperInputStyle = {
  flex: 1,
  height: "44px",
  borderRadius: "12px",
  border: "1px solid #333",
  backgroundColor: "#1a1a1a",
  color: "white",
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
  const [editingReceivedIndex, setEditingReceivedIndex] = useState(null);
  const [receivedShotsDraft, setReceivedShotsDraft] = useState("");

  const [showHcpEditor, setShowHcpEditor] = useState(false);
  const [hcpDraft, setHcpDraft] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [showLatestAdded, setShowLatestAdded] = useState(false);

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

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.backgroundColor = "black";
    document.body.style.color = "white";
    document.body.style.fontFamily = appFont;

    return () => {
      document.body.style.margin = "";
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
      document.body.style.fontFamily = "";
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCourses));
  }, [savedCourses]);

  useEffect(() => {
    localStorage.setItem(ROUNDS_STORAGE_KEY, JSON.stringify(savedRounds));
  }, [savedRounds]);

  useEffect(() => {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  const favorites = savedCourses.filter((course) => course.favorite);
  const nearbyCourses = savedCourses.slice(0, 5);
  const latestAddedCourses = [...savedCourses]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  const filteredCourses = savedCourses.filter((course) =>
    course.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

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
    setShowRoundsHistory(false);
    setRoundAlreadySaved(false);
    setManualReceivedShots({});
    setEditingReceivedIndex(null);
    setReceivedShotsDraft("");
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
    setEditingReceivedIndex(null);
    setReceivedShotsDraft("");
    setShowRoundSetup(false);
  };

  const closeCourse = () => {
    setOpenedCourse(null);
    setShowRoundSetup(false);
    setRoundScores([]);
    setShowRoundsHistory(false);
    setRoundAlreadySaved(false);
    setManualReceivedShots({});
    setEditingReceivedIndex(null);
    setReceivedShotsDraft("");
    setRoundSetup({
      competitionName: "",
      totalCompetitionHoles: 18,
      startHole: 1
    });
  };

  const getReceivedShots = (playerHcp, strokeIndex) => {
    const hcp = Math.floor(Number(playerHcp || 0));
    const si = Number(strokeIndex || 0);

    if (hcp <= 0 || si <= 0) return 0;

    return Math.max(0, Math.floor((hcp - si) / 18) + 1);
  };

  const getEffectiveReceivedShots = (index, playerHcp, strokeIndex) => {
    const manualValue = manualReceivedShots[index];

    if (manualValue !== undefined && manualValue !== null && manualValue !== "") {
      return Number(manualValue);
    }

    return getReceivedShots(playerHcp, strokeIndex);
  };

  const openReceivedShotsEditor = (index, currentValue) => {
    setEditingReceivedIndex(index);
    setReceivedShotsDraft(String(currentValue));
  };

  const setManualReceivedShotValue = (value) => {
    const cleanValue = String(value).replace(/\D/g, "");
    setReceivedShotsDraft(cleanValue);
  };

  const confirmManualReceivedShotValue = (index) => {
    if (receivedShotsDraft === "") {
      setManualReceivedShots((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    } else {
      const numericValue = Math.max(0, Math.min(5, Number(receivedShotsDraft)));

      setManualReceivedShots((prev) => ({
        ...prev,
        [index]: numericValue
      }));
    }

    setEditingReceivedIndex(null);
    setReceivedShotsDraft("");
    setRoundAlreadySaved(false);
  };

  const clearManualReceivedShotValue = (index) => {
    setManualReceivedShots((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    setEditingReceivedIndex(null);
    setReceivedShotsDraft("");
    setRoundAlreadySaved(false);
  };

  const getStablefordPoints = (par, strokesMade, receivedShots) => {
    const parValue = Number(par || 0);
    const strokes = Number(strokesMade || 0);
    const shots = Number(receivedShots || 0);

    if (!strokes) return 0;

    return Math.max(0, 2 + parValue + shots - strokes);
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
  }, [competitionHoles, roundScores, userProfile.hcp, manualReceivedShots]);

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
  }, [competitionHoles, roundScores, userProfile.hcp, manualReceivedShots]);

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
  }, [competitionHoles, stablefordTotal, userProfile.hcp]);

  const updateRoundScore = (index, value) => {
    const updated = [...roundScores];
    updated[index] = value;
    setRoundScores(updated);
    setRoundAlreadySaved(false);
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
    if (rawValue === "") return;

    let value = Number(rawValue);

    if (Number.isNaN(value)) {
      updateRoundScore(index, "");
      return;
    }

    if (value < 1) value = 1;
    if (value > 15) value = 15;

    updateRoundScore(index, value);
  };

  const adjustRoundScore = (index, delta) => {
    const rawValue = roundScores[index];
    const isEmpty =
      rawValue === "" || rawValue === null || typeof rawValue === "undefined";
    const currentValue = isEmpty ? 0 : Number(rawValue);

    if (delta < 0) {
      if (isEmpty || currentValue <= 1) {
        updateRoundScore(index, "");
        return;
      }

      updateRoundScore(index, currentValue - 1);
      return;
    }

    if (delta > 0) {
      if (isEmpty || currentValue === 0) {
        updateRoundScore(index, 1);
        return;
      }

      updateRoundScore(index, Math.min(15, currentValue + 1));
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

    setSavedRounds((prev) => [newRound, ...prev]);
    setRoundAlreadySaved(true);
    setShowRoundsHistory(true);
  };

  const roundsForOpenedCourse = openedCourse
    ? savedRounds.filter((round) => round.courseId === openedCourse.id)
    : [];

  const openHcpEditor = () => {
    setHcpDraft(String(userProfile.hcp));
    setShowHcpEditor(true);
  };

  const closeHcpEditor = () => {
    setShowHcpEditor(false);
    setHcpDraft("");
  };

  const saveHcp = () => {
    const cleanValue = String(hcpDraft).replace(",", ".").trim();
    const numeric = Number(cleanValue);

    if (Number.isNaN(numeric) || numeric < 0) return;

    setUserProfile((prev) => ({
      ...prev,
      hcp: Number(numeric.toFixed(1))
    }));
    closeHcpEditor();
  };

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
    backgroundColor: enabled ? "#2ecc71" : "#244233",
    border: "none",
    color: "black",
    fontWeight: 700,
    borderRadius: "12px",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.6,
    fontFamily: appFont,
    fontSize: "15px"
  });

  const secondaryButtonStyle = {
    marginTop: "10px",
    width: "100%",
    padding: "13px",
    backgroundColor: "#2a2a2a",
    border: "none",
    color: "white",
    borderRadius: "12px",
    cursor: "pointer",
    fontFamily: appFont,
    fontSize: "15px"
  };

  const subtleButtonStyle = {
    marginTop: "10px",
    width: "100%",
    padding: "13px",
    backgroundColor: "#1b1b1b",
    border: "1px solid #333",
    color: "#bbb",
    borderRadius: "12px",
    cursor: "pointer",
    fontFamily: appFont,
    fontSize: "15px"
  };

  const stepperCardStyle = (active) => ({
    marginBottom: "16px",
    padding: "14px",
    borderRadius: "14px",
    border: active ? "1px solid #2ecc71" : "1px solid #2b2b2b",
    backgroundColor: active ? "#141f18" : "#111",
    transition: "all 0.2s ease",
    cursor: "pointer"
  });

  const favoriteIconStyle = (active) => ({
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    border: active ? "1px solid #2ecc71" : "1px solid #444",
    backgroundColor: active ? "#163322" : "#151515",
    color: active ? "#2ecc71" : "#8b8b8b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "16px",
    flexShrink: 0
  });

  const cardStyle = {
    backgroundColor: "#111",
    border: "1px solid #222",
    borderRadius: "16px",
    padding: "16px"
  };

  const setupCardOptionStyle = (active) => ({
    padding: "16px",
    borderRadius: "14px",
    border: active ? "1px solid #2ecc71" : "1px solid #333",
    backgroundColor: active ? "#141f18" : "#1a1a1a",
    cursor: "pointer",
    fontWeight: 600,
    textAlign: "center"
  });

  const renderCourseRow = (course) => (
    <div
      key={course.id}
      onClick={() => prepareRoundSetup(course)}
      style={{
        padding: "14px 0",
        borderBottom: "1px solid #222",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        fontFamily: appFont,
        cursor: "pointer"
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "16px", fontWeight: 500 }}>{course.name}</div>
        <div
          style={{
            color: "#8c8c8c",
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
        style={favoriteIconStyle(course.favorite)}
        title="Preferito"
      >
        ⛳️
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
          backgroundColor: "black",
          color: "white",
          minHeight: "100vh",
          padding: "20px",
          boxSizing: "border-box",
          fontFamily: appFont
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px"
          }}
        >
          <button
            onClick={closeCourse}
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "23px",
              border: "1px solid #444",
              backgroundColor: "#111",
              color: "white",
              fontSize: "22px",
              cursor: "pointer",
              fontFamily: appFont
            }}
          >
            ←
          </button>

          <div style={{ fontSize: "16px", fontWeight: 500 }}>
            Imposta il giro
          </div>

          <div style={{ width: "46px" }} />
        </div>

        <div
          style={{
            marginTop: "24px",
            padding: "18px",
            backgroundColor: "#111",
            border: "1px solid #222",
            borderRadius: "18px"
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 700 }}>
            {openedCourse.name}
          </div>

          <div
            style={{
              marginTop: "8px",
              color: "#9a9a9a",
              fontSize: "14px",
              lineHeight: 1.5
            }}
          >
            Campo da {openedCourse.holesCount} buche
          </div>
        </div>

        <h2 style={titleStyle}>Nome gara</h2>
        <div style={cardStyle}>
          <input
            type="text"
            value={roundSetup.competitionName}
            onChange={(e) =>
              setRoundSetup((prev) => ({
                ...prev,
                competitionName: e.target.value
              }))
            }
            placeholder="Es. Stableford sabato, Gara sociale, Allenamento"
            style={{
              width: "100%",
              padding: "13px 14px",
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "12px",
              color: "white",
              boxSizing: "border-box",
              outline: "none",
              fontSize: "15px",
              fontFamily: appFont
            }}
          />
        </div>

        <h2 style={titleStyle}>Buche di gara</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px"
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

        <h2 style={titleStyle}>Buca di partenza</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              openedCourse.holesCount === 18 ? "repeat(6, 1fr)" : "repeat(3, 1fr)",
            gap: "12px"
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

        <div
          style={{
            marginTop: "20px",
            backgroundColor: "#111",
            border: "1px solid #222",
            borderRadius: "16px",
            padding: "16px"
          }}
        >
          <div style={{ color: "#8e8e8e", fontSize: "13px" }}>Anteprima</div>
          <div style={{ marginTop: "8px", fontSize: "16px", fontWeight: 600 }}>
            {roundSetup.totalCompetitionHoles} buche • partenza dalla {roundSetup.startHole}
          </div>
          <div
            style={{
              marginTop: "8px",
              color: "#8c8c8c",
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
      </div>
    );
  }

  if (openedCourse && !showRoundSetup) {
    return (
      <div
        style={{
          backgroundColor: "black",
          color: "white",
          minHeight: "100vh",
          padding: "20px",
          boxSizing: "border-box",
          fontFamily: appFont
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px"
          }}
        >
          <button
            onClick={closeCourse}
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "23px",
              border: "1px solid #444",
              backgroundColor: "#111",
              color: "white",
              fontSize: "22px",
              cursor: "pointer",
              fontFamily: appFont
            }}
          >
            ←
          </button>

          <div style={{ fontSize: "16px", fontWeight: 500 }}>
            Scorecard
          </div>

          <div
            onClick={() => toggleFavorite(openedCourse.id)}
            style={favoriteIconStyle(openedCourse.favorite)}
            title="Preferito"
          >
            ⛳️
          </div>
        </div>

        <div
          style={{
            marginTop: "24px",
            padding: "18px",
            backgroundColor: "#111",
            border: "1px solid #222",
            borderRadius: "18px"
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 700 }}>
            {openedCourse.name}
          </div>

          <div
            style={{
              marginTop: "8px",
              color: "#9a9a9a",
              fontSize: "14px",
              lineHeight: 1.5
            }}
          >
            {roundSetup.totalCompetitionHoles} buche di gara • partenza dalla {roundSetup.startHole}
          </div>

          <div
            style={{
              marginTop: "10px",
              color: "#8c8c8c",
              fontSize: "13px"
            }}
          >
            {userProfile.firstName} • HCP {userProfile.hcp}
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
          <div
            style={{
              backgroundColor: "#111",
              border: "1px solid #222",
              borderRadius: "16px",
              padding: "16px"
            }}
          >
            <div style={{ color: "#8e8e8e", fontSize: "13px" }}>Lordo</div>
            <div style={{ marginTop: "6px", fontSize: "26px", fontWeight: 700 }}>
              {grossTotal}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#111",
              border: "1px solid #222",
              borderRadius: "16px",
              padding: "16px"
            }}
          >
            <div style={{ color: "#8e8e8e", fontSize: "13px" }}>Stableford</div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "26px",
                fontWeight: 700,
                color: "#2ecc71"
              }}
            >
              {stablefordTotal}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "12px",
            backgroundColor: "#111",
            border: "1px solid #222",
            borderRadius: "16px",
            padding: "16px"
          }}
        >
          <div style={{ color: "#8e8e8e", fontSize: "13px" }}>
            HCP stimato dopo il giro
          </div>
          <div
            style={{
              marginTop: "6px",
              fontSize: "24px",
              fontWeight: 700,
              color: "#2ecc71"
            }}
          >
            {estimatedHcpAfterRound}
          </div>
          <div
            style={{
              marginTop: "8px",
              color: "#8e8e8e",
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
            const receivedShots = getEffectiveReceivedShots(
              index,
              userProfile.hcp,
              hole.strokeIndex
            );
            const stablefordPoints = getStablefordPoints(
              hole.par,
              roundScores[index],
              receivedShots
            );

            return (
              <div
                key={`${hole.competitionHoleNumber}-${hole.courseHoleNumber}-${index}`}
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #222",
                  borderRadius: "16px",
                  padding: "16px",
                  marginTop: "12px"
                }}
              >
                <div
                  style={{
                    color: "#8c8c8c",
                    fontSize: "13px",
                    marginBottom: "6px"
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
                        marginTop: "4px",
                        color: "#8c8c8c",
                        fontSize: "14px"
                      }}
                    >
                      ⛳️ {hole.courseHoleNumber}
                    </div>
                  </div>

                  <div
                    style={{
                      color: "#2ecc71",
                      fontSize: "14px",
                      fontWeight: 600
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
                    marginTop: "12px"
                  }}
                >
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      backgroundColor: "#171717",
                      border: "1px solid #2b2b2b",
                      color: "#d0d0d0",
                      fontSize: "13px"
                    }}
                  >
                    Par {hole.par}
                  </div>

                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      backgroundColor: "#171717",
                      border: "1px solid #2b2b2b",
                      color: "#d0d0d0",
                      fontSize: "13px"
                    }}
                  >
                    SI {hole.strokeIndex}
                  </div>

                  {editingReceivedIndex === index ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap"
                      }}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        value={receivedShotsDraft}
                        onChange={(e) => setManualReceivedShotValue(e.target.value)}
                        onFocus={(e) => {
                          setTimeout(() => e.target.select(), 0);
                        }}
                        autoFocus
                        style={{
                          width: "56px",
                          height: "36px",
                          borderRadius: "10px",
                          border: "1px solid #244233",
                          backgroundColor: "#16261c",
                          color: "#2ecc71",
                          textAlign: "center",
                          outline: "none",
                          fontSize: "14px",
                          fontFamily: appFont
                        }}
                      />

                      <button
                        onClick={() => confirmManualReceivedShotValue(index)}
                        style={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333",
                          color: "white",
                          borderRadius: "10px",
                          padding: "8px 10px",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontFamily: appFont
                        }}
                      >
                        OK
                      </button>

                      <button
                        onClick={() => clearManualReceivedShotValue(index)}
                        style={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333",
                          color: "#bbb",
                          borderRadius: "10px",
                          padding: "8px 10px",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontFamily: appFont
                        }}
                      >
                        Auto
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openReceivedShotsEditor(index, receivedShots)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: "#16261c",
                        border: "1px solid #244233",
                        color: "#2ecc71",
                        fontSize: "13px",
                        cursor: "pointer",
                        fontFamily: appFont
                      }}
                    >
                      Ricevi {receivedShots}
                      {manualReceivedShots[index] !== undefined ? " *" : ""}
                    </button>
                  )}
                </div>

                <div style={{ marginTop: "14px" }}>
                  <div
                    style={{
                      color: "#a0a0a0",
                      fontSize: "13px",
                      marginBottom: "8px"
                    }}
                  >
                    Colpi fatti
                  </div>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: "10px" }}
                  >
                    <button
                      onClick={() => adjustRoundScore(index, -1)}
                      style={stepperButtonStyle}
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
                      style={stepperButtonStyle}
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
              color: "#8f8f8f",
              backgroundColor: "#111",
              border: "1px solid #222",
              borderRadius: "14px",
              padding: "16px",
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

        <button
          onClick={() => setShowRoundsHistory((prev) => !prev)}
          style={secondaryButtonStyle}
        >
          {showRoundsHistory ? "Nascondi storico" : "Mostra storico"}
        </button>

        {showRoundsHistory && (
          <div style={{ marginTop: "14px" }}>
            <h2 style={{ ...titleStyle, marginTop: "0" }}>Storico giri</h2>

            {roundsForOpenedCourse.length === 0 ? (
              <div
                style={{
                  color: "#8f8f8f",
                  backgroundColor: "#111",
                  border: "1px solid #222",
                  borderRadius: "14px",
                  padding: "16px"
                }}
              >
                Nessun giro salvato per questo campo.
              </div>
            ) : (
              roundsForOpenedCourse.map((round) => (
                <div
                  key={round.id}
                  style={{
                    backgroundColor: "#111",
                    border: "1px solid #222",
                    borderRadius: "16px",
                    padding: "16px",
                    marginBottom: "12px"
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      marginBottom: "6px"
                    }}
                  >
                    {round.savedName}
                  </div>

                  <div
                    style={{
                      color: "#8e8e8e",
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
                        backgroundColor: "#171717",
                        border: "1px solid #2b2b2b",
                        fontSize: "13px"
                      }}
                    >
                      Lordo {round.grossTotal}
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: "#171717",
                        border: "1px solid #2b2b2b",
                        fontSize: "13px"
                      }}
                    >
                      Netto {round.netTotal}
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        backgroundColor: "#16261c",
                        border: "1px solid #244233",
                        color: "#2ecc71",
                        fontSize: "13px"
                      }}
                    >
                      Stableford {round.stablefordTotal}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      color: "#8e8e8e",
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
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "black",
        color: "white",
        minHeight: "100vh",
        padding: "20px",
        boxSizing: "border-box",
        fontFamily: appFont
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px"
        }}
      >
        <button
          onClick={openDialog}
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "23px",
            border: "1px solid #444",
            backgroundColor: "#111",
            color: "white",
            fontSize: "24px",
            cursor: "pointer",
            fontFamily: appFont,
            flexShrink: 0
          }}
        >
          +
        </button>

        <div
          style={{
            flex: 1,
            textAlign: "right",
            lineHeight: 1.2
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "white"
            }}
          >
            {userProfile.firstName}
          </div>

          <div
            style={{
              marginTop: "3px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "4px"
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#8c8c8c"
              }}
            >
              HCP {userProfile.hcp}
            </div>

            <button
              onClick={openHcpEditor}
              style={{
                background: "transparent",
                border: "none",
                color: "#b5b5b5",
                fontSize: "12px",
                padding: 0,
                cursor: "pointer",
                fontFamily: appFont
              }}
            >
              Aggiorna
            </button>
          </div>
        </div>
      </div>

      <h2 style={titleStyle}>Preferiti</h2>
      <div style={cardStyle}>
        {favorites.length === 0 ? (
          <div style={{ color: "#888" }}>
            Usa ⛳️ per salvare i campi
          </div>
        ) : (
          favorites.map((course) => renderCourseRow(course))
        )}
      </div>

      <h2 style={titleStyle}>Vicino a te</h2>
      <div style={cardStyle}>
        {nearbyCourses.length === 0 ? (
          <div style={{ color: "#888", lineHeight: 1.5 }}>
            Quando aggiungerai i primi campi, li vedrai qui. Più avanti collegheremo
            anche la geolocalizzazione.
          </div>
        ) : (
          nearbyCourses.map((course) => renderCourseRow(course))
        )}
      </div>

      <h2 style={titleStyle}>Cerca un campo</h2>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "14px",
            padding: "12px 14px"
          }}
        >
          <div style={{ color: "#7d7d7d", fontSize: "16px" }}>⌕</div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca un campo"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "white",
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
              <div
                style={{
                  color: "#9a9a9a",
                  lineHeight: 1.5,
                  paddingTop: "8px"
                }}
              >
                Campo non trovato. Usa il pulsante + per aggiungerlo.
              </div>
            )}
          </div>
        )}
      </div>

      <div
        onClick={() => setShowLatestAdded((prev) => !prev)}
        style={{
          ...titleStyle,
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          marginBottom: "14px"
        }}
      >
        <span>Ultimi aggiunti</span>
        <span
          style={{
            color: "#b5b5b5",
            fontSize: "18px",
            lineHeight: 1,
            transform: showLatestAdded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease"
          }}
        >
          ▾
        </span>
      </div>

      {showLatestAdded && (
        <div style={cardStyle}>
          {latestAddedCourses.length === 0 ? (
            <div style={{ color: "#888" }}>
              Nessun campo aggiunto di recente.
            </div>
          ) : (
            latestAddedCourses.map((course) => renderCourseRow(course))
          )}
        </div>
      )}

      {showHcpEditor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.86)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            boxSizing: "border-box",
            zIndex: 20
          }}
        >
          <div
            style={{
              backgroundColor: "#111",
              padding: "24px",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "390px",
              border: "1px solid #222",
              boxSizing: "border-box",
              fontFamily: appFont
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: "8px",
                fontSize: "24px",
                fontWeight: 700
              }}
            >
              Aggiorna HCP
            </h3>

            <p
              style={{
                color: "#aaa",
                fontSize: "14px",
                marginTop: 0,
                marginBottom: "16px",
                lineHeight: 1.4
              }}
            >
              Inserisci il tuo HCP attuale.
            </p>

            <input
              type="text"
              inputMode="decimal"
              value={hcpDraft}
              onChange={(e) => setHcpDraft(e.target.value)}
              placeholder="Es. 36"
              style={{
                width: "100%",
                padding: "13px 14px",
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "12px",
                color: "white",
                boxSizing: "border-box",
                outline: "none",
                fontSize: "15px",
                fontFamily: appFont
              }}
            />

            <button onClick={saveHcp} style={primaryButtonStyle(true)}>
              Salva HCP
            </button>

            <button onClick={closeHcpEditor} style={secondaryButtonStyle}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {showDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.86)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            boxSizing: "border-box",
            zIndex: 10
          }}
        >
          <div
            style={{
              backgroundColor: "#111",
              padding: "24px",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "390px",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid #222",
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
                    color: "#aaa",
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
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "12px",
                    color: "white",
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
                    color: "#aaa",
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
                      backgroundColor: "#1a1a1a",
                      border:
                        holesCount === 9 ? "1px solid #2ecc71" : "1px solid #333",
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
                          holesCount === 9 ? "2px solid #2ecc71" : "2px solid #666",
                        backgroundColor:
                          holesCount === 9 ? "#2ecc71" : "transparent"
                      }}
                    />
                  </div>

                  <div
                    onClick={() => setHolesCount(18)}
                    style={{
                      flex: 1,
                      padding: "16px",
                      backgroundColor: "#1a1a1a",
                      border:
                        holesCount === 18 ? "1px solid #2ecc71" : "1px solid #333",
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
                          holesCount === 18 ? "2px solid #2ecc71" : "2px solid #666",
                        backgroundColor:
                          holesCount === 18 ? "#2ecc71" : "transparent"
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
                    backgroundColor: "#16261c",
                    border: "1px solid #244233",
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
                    color: "#b5b5b5",
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
                    color: "#8e8e8e",
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
                    color: "#8f8f8f",
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
                    backgroundColor: "#1f1f1f",
                    borderRadius: "999px",
                    overflow: "hidden",
                    marginBottom: "20px"
                  }}
                >
                  <div
                    style={{
                      width: `${((currentHoleIndex + 1) / holesCount) * 100}%`,
                      height: "100%",
                      backgroundColor: "#2ecc71",
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
                    color: "#aaa",
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
                      color: "#c7c7c7",
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
                      style={stepperButtonStyle}
                    >
                      -
                    </button>

                    <div style={stepperValueStyle}>{currentHole.par}</div>

                    <button
                      onClick={() => adjustPar(1)}
                      style={stepperButtonStyle}
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
                    <label style={{ fontSize: "14px", color: "#c7c7c7" }}>
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
                          border: "1px solid #555",
                          backgroundColor: "#1a1a1a",
                          color: "#d5d5d5",
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
                      style={stepperButtonStyle}
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
                      style={stepperButtonStyle}
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
                      backgroundColor: "#171717",
                      border: "1px solid #2b2b2b",
                      borderRadius: "12px",
                      color: "#bcbcbc",
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
                    color: "#aaa",
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
                    color: "#8f8f8f",
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
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333"
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
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333"
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
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333"
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
                    backgroundColor: "#151515",
                    border: "1px solid #292929",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span style={{ color: "#cfcfcf", fontSize: "15px" }}>
                    Par totale campo
                  </span>
                  <span
                    style={{
                      color: "#2ecc71",
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
                    color: "#8e8e8e",
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