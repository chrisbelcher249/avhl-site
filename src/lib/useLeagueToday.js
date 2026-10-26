"use client";

import { useEffect, useState } from "react";
import { currentEasternDate } from "@/lib/scheduleDateGroups";

// Refresh day classification while an owner leaves the schedule tab open.
// This changes date-group visibility shortly after midnight ET without reload.
export function useLeagueToday(serverTodayDate = "") {
  const [todayDate, setTodayDate] = useState(serverTodayDate);
  useEffect(() => {
    const updateDate = () => {
      const next = currentEasternDate();
      setTodayDate((previous) => previous === next ? previous : next);
    };
    updateDate();
    const interval = window.setInterval(updateDate, 1000);
    return () => window.clearInterval(interval);
  }, []);
  return todayDate;
}
