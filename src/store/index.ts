import { useStore } from 'zustand'
import { LocalRepo } from '../storage/LocalRepo'
import { createRoomBackend } from '../sync'
import { createAppStore, type AppState } from './appStore'

export const repo = new LocalRepo()
export const appStore = createAppStore(repo, createRoomBackend())

export function useApp<T>(selector: (s: AppState) => T): T {
  return useStore(appStore, selector)
}

export const actions = () => appStore.getState()
