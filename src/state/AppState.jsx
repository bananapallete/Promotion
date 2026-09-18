import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { produce } from 'immer'
import { DEFAULT_PROMOTION, DEFAULT_SURVEY, PRODUCT_LIST } from '../data/content.js'

const STORAGE_KEY = 'midas-promotion-builder-v1'

const AppStateContext = createContext(null)

// Merges persisted (possibly stale/older-schema) data onto the current
// defaults so newly-added fields are always present. Arrays are taken
// wholesale from `override` when present (they're user-editable lists, not
// fixed shapes); objects are merged key-by-key following `base`'s shape, so
// keys removed from the schema are dropped and keys added to it fall back
// to their default instead of leaving `undefined` that would crash render.
function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base
  }
  if (base && typeof base === 'object' && override && typeof override === 'object') {
    const result = {}
    for (const key of Object.keys(base)) {
      result[key] = deepMerge(base[key], override[key])
    }
    return result
  }
  return override !== undefined ? override : base
}

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
    promotion: deepMerge(DEFAULT_PROMOTION, persisted?.promotion),
    survey: deepMerge(DEFAULT_SURVEY, persisted?.survey),
    sections: persisted?.sections ?? { sale: true, study: true, gift: true, notice: true },
    itemCounts: persisted?.itemCounts ?? { sale: 2, study: 2 },
    keepSide: persisted?.keepSide ?? { sale: 'left', study: 'left' },
    activeProducts:
      persisted?.activeProducts ??
      PRODUCT_LIST.reduce((acc, code) => ({ ...acc, [code]: true }), {}),
    giftQr: persisted?.giftQr ?? true,
    giftDesign: persisted?.giftDesign ?? 'A',
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

  const setKeepSide = useCallback((key, side) => {
    setState((s) => ({ ...s, keepSide: { ...s.keepSide, [key]: side } }))
  }, [])

  const toggleProduct = useCallback((code) => {
    setState((s) => ({
      ...s,
      activeProducts: { ...s.activeProducts, [code]: !s.activeProducts[code] },
    }))
  }, [])

  const toggleGiftQr = useCallback(() => {
    setState((s) => ({ ...s, giftQr: !s.giftQr }))
  }, [])

  const setGiftDesign = useCallback((design) => {
    setState((s) => ({ ...s, giftDesign: design }))
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
      setKeepSide,
      toggleProduct,
      toggleGiftQr,
      setGiftDesign,
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
      setKeepSide,
      toggleProduct,
      toggleGiftQr,
      setGiftDesign,
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
    sections: { sale: true, study: true, gift: true, notice: true },
    itemCounts: { sale: 2, study: 2 },
    keepSide: { sale: 'left', study: 'left' },
    activeProducts: PRODUCT_LIST.reduce((acc, code) => ({ ...acc, [code]: true }), {}),
    giftQr: true,
    giftDesign: 'A',
    qrImage: null,
  }
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}

export { PRODUCT_LIST }
