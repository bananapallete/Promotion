import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { produce } from 'immer'
import { DEFAULT_PROMOTION, DEFAULT_SURVEY, PRODUCT_LIST } from '../data/content.js'

const STORAGE_KEY = 'midas-promotion-builder-v1'

const AppStateContext = createContext(null)

function loadPersisted() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function buildInitialState() {
  const persisted = loadPersisted()
  return {
    theme: persisted?.theme ?? 'light',
    lang: persisted?.lang ?? 'kr',
    promotion: persisted?.promotion ?? DEFAULT_PROMOTION,
    survey: persisted?.survey ?? DEFAULT_SURVEY,
    sections: persisted?.sections ?? { sale: true, study: true, gift: true },
    itemCounts: persisted?.itemCounts ?? { sale: 2, study: 2 },
    activeProducts:
      persisted?.activeProducts ??
      PRODUCT_LIST.reduce((acc, code) => ({ ...acc, [code]: true }), {}),
    giftImage: persisted?.giftImage ?? null,
    qrImage: persisted?.qrImage ?? null,
  }
}

export function AppProvider({ children }) {
  const [state, setState] = useState(buildInitialState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [state])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
    document.documentElement.setAttribute('lang', state.lang === 'kr' ? 'ko' : 'en')
  }, [state.theme, state.lang])

  const toggleTheme = useCallback(() => {
    setState((s) => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))
  }, [])

  const toggleLang = useCallback(() => {
    setState((s) => ({ ...s, lang: s.lang === 'kr' ? 'en' : 'kr' }))
  }, [])

  const updatePromotion = useCallback((lang, updater) => {
    setState((s) =>
      produce(s, (draft) => {
        updater(draft.promotion[lang])
      }),
    )
  }, [])

  const updateSurvey = useCallback((lang, updater) => {
    setState((s) =>
      produce(s, (draft) => {
        updater(draft.survey[lang])
      }),
    )
  }, [])

  const toggleSection = useCallback((key) => {
    setState((s) => ({ ...s, sections: { ...s.sections, [key]: !s.sections[key] } }))
  }, [])

  const setItemCount = useCallback((key, count) => {
    setState((s) => ({ ...s, itemCounts: { ...s.itemCounts, [key]: count } }))
  }, [])

  const toggleProduct = useCallback((code) => {
    setState((s) => ({
      ...s,
      activeProducts: { ...s.activeProducts, [code]: !s.activeProducts[code] },
    }))
  }, [])

  const setGiftImage = useCallback((dataUrl) => {
    setState((s) => ({ ...s, giftImage: dataUrl }))
  }, [])

  const setQrImage = useCallback((dataUrl) => {
    setState((s) => ({ ...s, qrImage: dataUrl }))
  }, [])

  const resetAll = useCallback(() => {
    setState((s) => ({
      ...buildInitialStateDefaults(),
      theme: s.theme,
    }))
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      toggleTheme,
      toggleLang,
      updatePromotion,
      updateSurvey,
      toggleSection,
      setItemCount,
      toggleProduct,
      setGiftImage,
      setQrImage,
      resetAll,
    }),
    [
      state,
      toggleTheme,
      toggleLang,
      updatePromotion,
      updateSurvey,
      toggleSection,
      setItemCount,
      toggleProduct,
      setGiftImage,
      setQrImage,
      resetAll,
    ],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

function buildInitialStateDefaults() {
  return {
    lang: 'kr',
    promotion: DEFAULT_PROMOTION,
    survey: DEFAULT_SURVEY,
    sections: { sale: true, study: true, gift: true },
    itemCounts: { sale: 2, study: 2 },
    activeProducts: PRODUCT_LIST.reduce((acc, code) => ({ ...acc, [code]: true }), {}),
    giftImage: null,
    qrImage: null,
  }
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}

export { PRODUCT_LIST }
