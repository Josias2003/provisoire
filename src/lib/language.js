const LANG_KEY = 'provisoire_language_v1'

export function getLanguage() {
  return localStorage.getItem(LANG_KEY) || 'rw'
}

export function setLanguage(lang) {
  localStorage.setItem(LANG_KEY, lang)
}

/** Returns { text, options } for the requested language, falling back to
 * the source Kinyarwanda if an English translation isn't present. */
export function localizeQuestion(question, lang) {
  if (lang === 'en' && question.en) {
    return {
      text: question.en.text || question.text,
      options: question.options.map((opt, i) => ({
        ...opt,
        text: question.en.options?.[i]?.text || opt.text,
      })),
    }
  }
  return { text: question.text, options: question.options }
}
