import { localizeQuestion } from '../lib/language'
import { renderRichText } from '../lib/richText'

/**
 * Renders one question (text and/or image stem, 4 text-and/or-image options).
 *
 * Options are identified by their position (index) rather than their source
 * letter: a handful of questions in the source PDF itself skip a letter and
 * reuse another (e.g. two options both printed as "c)") - a genuine defect
 * in the original document, preserved here rather than silently relabeled.
 * Using the index keeps React and the click/scoring logic unambiguous while
 * still displaying each option's original printed letter.
 *
 * `lang` ('rw' | 'en') picks which text to render; images are shared across
 * both languages. Correctness/images always come from the original question
 * object - only text is localized.
 *
 * - Quiz mode (interactive=true): click an option to answer. Once answered
 *   (selectedIndex is set), options lock and correct/incorrect coloring shows.
 * - Review mode (interactive=false): always shows the locked-in coloring for
 *   the given selectedIndex (the user's original answer for that question).
 */
export default function QuestionCard({ question, selectedIndex, onSelect, interactive, lang = 'rw' }) {
  const answered = selectedIndex != null
  const localized = localizeQuestion(question, lang)

  function optionClass(opt, idx) {
    if (!answered) return 'option'
    if (opt.correct) return 'option option-correct'
    if (idx === selectedIndex && !opt.correct) return 'option option-wrong'
    return 'option option-disabled'
  }

  return (
    <div className="question-card">
      <div className="question-stem">
        <p className="question-text">{renderRichText(localized.text)}</p>
        {question.image && (
          <img className="question-image" src={question.image} alt="" />
        )}
        {question.images && question.images.length > 0 && (
          <div className="question-image-row">
            {question.images.map((src, i) => (
              <img className="question-image" key={i} src={src} alt="" />
            ))}
          </div>
        )}
      </div>

      <div className="options">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            className={optionClass(opt, idx)}
            disabled={!interactive || answered}
            onClick={() => onSelect && onSelect(idx)}
          >
            <span className="option-letter">{opt.letter.toUpperCase()}</span>
            <span className="option-body">
              {localized.options[idx].text && (
                <span className="option-text">{renderRichText(localized.options[idx].text)}</span>
              )}
              {opt.image && <img className="option-image" src={opt.image} alt="" />}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
