import { create } from 'zustand';
import type { AttendanceRecord, TodayStatus, AttendanceSummary, AttendanceFilter } from '../types';

interface AttendanceState {
  todayStatus: TodayStatus | null;
  myAttendance: AttendanceRecord[];
  allAttendance: AttendanceRecord[];
  summary: AttendanceSummary | null;
  isLoading: boolean;
  error: string | null;
  filters: AttendanceFilter;

  // Actions
  setTodayStatus: (status: TodayStatus) => void;
  setMyAttendance: (records: AttendanceRecord[]) => void;
  setAllAttendance: (records: AttendanceRecord[]) => void;
  setSummary: (summary: AttendanceSummary) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: AttendanceFilter) => void;
  clearFilters: () => void;
  reset: () => void;
}

const initialFilters: AttendanceFilter = {
  employeeId: undefined,
  startDate: undefined,
  endDate: undefined,
  status: undefined,
  department: undefined,
};

export const useAttendanceStore = create<AttendanceState>((set) => ({
  todayStatus: null,
  myAttendance: [],
  allAttendance: [],
  summary: null,
  isLoading: false,
  error: null,
  filters: initialFilters,

  setTodayStatus: (status: TodayStatus) => set({ todayStatus: status }),
  
  setMyAttendance: (records: AttendanceRecord[]) => set({ myAttendance: records }),
  
  setAllAttendance: (records: AttendanceRecord[]) => set({ allAttendance: records }),
  
  setSummary: (summary: AttendanceSummary) => set({ summary }),
  
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  
  setError: (error: string | null) => set({ error, isLoading: false }),
  
  setFilters: (filters: AttendanceFilter) => 
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  
  clearFilters: () => set({ filters: initialFilters }),
  
  reset: () => set({
    todayStatus: null,
    myAttendance: [],
    allAttendance: [],
    summary: null,
    isLoading: false,
    error: null,
    filters: initialFilters,
  }),
}));
