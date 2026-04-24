import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const useAdminStore = create(
  immer((set, get) => ({
    badges: [],

    onPopulateBadges: (badges) => {
      set((state) => {
        state.badges = badges.map((item) => ({
          ...item,
          isEdit: false,
        }))
      })
    },

    toggleEdit: (empseriesid) => {
      set((state) => {
        const badge = state.badges.find((b) => b.empseriesid === empseriesid)
        if (badge) badge.isEdit = !badge.isEdit
      })
    },

    setRangeEdit: (fromId, toId, value) => {
      set((state) => {
        const fromIdx = state.badges.findIndex((b) => b.empseriesid === fromId)
        const toIdx = state.badges.findIndex((b) => b.empseriesid === toId)
        if (fromIdx === -1 || toIdx === -1) return
        const [start, end] = fromIdx < toIdx
          ? [fromIdx, toIdx]
          : [toIdx, fromIdx]
        for (let i = start; i <= end; i++) {
          state.badges[i].isEdit = value
        }
      })
    },

    updateBadgeNumber: (empseriesid, badgenumber) => {
      set((state) => {
        const badge = state.badges.find((b) => b.empseriesid === empseriesid)
        if (badge) badge.badgenumber = badgenumber
      })
    },
  }))
)

export default useAdminStore
