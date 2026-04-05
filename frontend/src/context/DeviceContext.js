import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { deviceAPI, sensorAPI } from '../api/client';
import { useAuth } from './AuthContext';

const DeviceContext = createContext(null);

const POLL_INTERVAL_MS = 5000; // 5s real-time polling

export const DeviceProvider = ({ children }) => {
  const { user } = useAuth();
  const [deviceState, setDeviceState] = useState({
    isOn: false,
    cycleRunning: false,
    cycleProgress: 0,      // 0–100%
    elapsedSeconds: 0,
    filterCycleCount: 0,
    filterHealthPct: 100,
  });
  const [sensorData, setSensorData] = useState({
    ph: null,
    turbidity: null,
    tds: null,
    timestamp: null,
  });
  const [loading, setLoading] = useState(false);

  const timerRef = useRef(null);
  const pollRef = useRef(null);

  // --- Polling ---
  const fetchState = useCallback(async () => {
    try {
      const [stateRes, sensorRes] = await Promise.all([
        deviceAPI.getState(),
        sensorAPI.getLatest(),
      ]);

      // Map backend DeviceState fields → frontend shape
      const state = stateRes.data?.data;
      if (state) {
        setDeviceState((prev) => ({
          ...prev,
          isOn: state.isPoweredOn ?? prev.isOn,
          cycleRunning: state.cycleStatus === 'running',
          filterHealthPct: state.filterHealthPercent ?? prev.filterHealthPct,
          filterCycleCount: state.cyclesSinceLastService ?? prev.filterCycleCount,
        }));
      }

      // Backend returns { data: { preFilter, postFilter } } — use postFilter for dashboard
      const postFilter = sensorRes.data?.data?.postFilter;
      setSensorData({
        ph: postFilter?.ph ?? null,
        turbidity: postFilter?.turbidity ?? null,
        tds: postFilter?.tds ?? null,
        timestamp: postFilter?.timestamp ?? null,
      });
    } catch {
      // silent — network blip handled by interceptor
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchState();
    pollRef.current = setInterval(fetchState, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [user, fetchState]);

  // --- Local elapsed timer ---
  useEffect(() => {
    if (deviceState.cycleRunning) {
      timerRef.current = setInterval(() => {
        setDeviceState((prev) => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [deviceState.cycleRunning]);

  // --- Controls ---
  const togglePower = async () => {
    setLoading(true);
    try {
      const { data } = await deviceAPI.toggle(!deviceState.isOn);
      setDeviceState((prev) => ({ ...prev, ...data }));
    } finally {
      setLoading(false);
    }
  };

  const startCycle = async () => {
    setLoading(true);
    try {
      const { data } = await deviceAPI.startCycle();
      const state = data?.data;
      setDeviceState((prev) => ({
        ...prev,
        cycleRunning: state?.cycleStatus === 'running' ?? true,
        filterHealthPct: state?.filterHealthPercent ?? prev.filterHealthPct,
        filterCycleCount: state?.cyclesSinceLastService ?? prev.filterCycleCount,
        elapsedSeconds: 0,
      }));
    } finally {
      setLoading(false);
    }
  };

  const pauseCycle = async () => {
    setLoading(true);
    try {
      const { data } = await deviceAPI.pauseCycle();
      const state = data?.data;
      setDeviceState((prev) => ({
        ...prev,
        cycleRunning: state?.cycleStatus === 'running' ?? false,
        filterHealthPct: state?.filterHealthPercent ?? prev.filterHealthPct,
        filterCycleCount: state?.cyclesSinceLastService ?? prev.filterCycleCount,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DeviceContext.Provider
      value={{ deviceState, sensorData, loading, togglePower, startCycle, pauseCycle, fetchState }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => useContext(DeviceContext);
