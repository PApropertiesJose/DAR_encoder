import { create } from 'zustand';

/**
 * Standard Zustand Store Template for DAR Encoder features.
 * Use this to manage local or global state for a feature.
 */
export const useFeatureStore = create((set) => ({
  // State
  items: [],
  selectedId: null,
  isFetching: false,
  error: null,

  // Actions
  setItems: (items) => set({ items }),
  selectItem: (id) => set({ selectedId: id }),
  reset: () => set({ items: [], selectedId: null, error: null }),
  
  // Async Example (if not using TanStack Query)
  fetchData: async () => {
    set({ isFetching: true });
    try {
      // const response = await axios.get('/api/data');
      // set({ items: response.data, isFetching: false });
    } catch (err) {
      set({ error: err.message, isFetching: false });
    }
  }
}));
