# -*- coding: utf-8 -*-
"""
Builds an English translation layer for data/questions.json.

Strategy (accuracy-first, MT-as-last-resort):
 1. Pure numeric/measurement option text (e.g. "toni 12", "cm 30", "km 40 mu isaha")
    is translated with a direct regex rule - no MT involved, 100% reliable.
 2. A hand-verified dictionary covers the ~100 boilerplate phrases that repeat
    across dozens of questions ("Nta gisubizo cy'ukuri kirimo", "A na B ni
    ibisubizo by'ukuri", "Iki cyapa gisobanura iki?", colors, brake types...).
 3. A short list of known machine-translation failure modes for this corpus
    (e.g. "ikinyamitende" -> "the palm tree", isolated "Umuyobozi" -> "Director")
    are neutralized by substituting a safer Kinyarwanda paraphrase *before*
    sending text to translation, based on directly-tested substitutions.
 4. Everything else goes through Google Translate (rw->en) via deep_translator,
    with in-memory + on-disk caching so identical strings are only translated
    once across the whole 404-question corpus.
"""
import json
import re
import time
import os
from deep_translator import GoogleTranslator

IN_PATH = r"D:\Provisoire\data\questions.json"
OUT_PATH = r"D:\Provisoire\data\questions.json"
CACHE_PATH = r"D:\Provisoire\extraction\translate_cache.json"

translator = GoogleTranslator(source='rw', target='en')

# ---------------------------------------------------------------------------
# 1. Numeric / measurement patterns - handled directly, never sent to MT.
# ---------------------------------------------------------------------------
NUMERIC_RULES = [
    (re.compile(r'^toni\s*(\d+(?:[.,]\d+)?)$', re.I), lambda m: f"{m.group(1)} tonnes"),
    (re.compile(r'^burenga\s+toni\s*(\d+(?:[.,]\d+)?)$', re.I), lambda m: f"over {m.group(1)} tonnes"),
    (re.compile(r'^(cm)\s*(\d+(?:[.,]\d+)?)$', re.I), lambda m: f"{m.group(2)} cm"),
    (re.compile(r'^(km)\s*(\d+(?:[.,]\d+)?)\s*(?:mu isaha|/h)?$', re.I), lambda m: f"{m.group(2)} km/h"),
    (re.compile(r'^m\s*(\d+(?:[.,]\d+)?)$', re.I), lambda m: f"{m.group(1)} m"),
    (re.compile(r'^metero\s*(\d+(?:[.,]\d+)?)$', re.I), lambda m: f"{m.group(1)} metres"),
    (re.compile(r'^m\s*(\d+)\s*na\s*cm\s*(\d+)$', re.I), lambda m: f"{m.group(1)} m {m.group(2)} cm"),
    (re.compile(r'^metero\s*(\d+)\s*na\s*(?:sentimetero|cm)\s*(\d+)$', re.I),
     lambda m: f"{m.group(1)} m {m.group(2)} cm"),
    (re.compile(r'^km\s*(\d+)\s*mu\s*isaha$', re.I), lambda m: f"{m.group(1)} km/h"),
    (re.compile(r'^ibirometero\s*(\d+)$', re.I), lambda m: f"{m.group(1)} km"),
    (re.compile(r'^kilogarama\s*(\d+)$', re.I), lambda m: f"{m.group(1)} kg"),
]


def try_numeric(text):
    t = text.strip()
    for pattern, fn in NUMERIC_RULES:
        m = pattern.match(t)
        if m:
            return fn(m)
    return None


# ---------------------------------------------------------------------------
# 2. Hand-verified boilerplate dictionary (normalized key -> English).
#    Normalization: lowercase, curly/straight apostrophes unified, whitespace
#    collapsed. Covers phrases that repeat across many questions verbatim.
# ---------------------------------------------------------------------------
def norm(s):
    s = s.strip().lower()
    s = s.replace('\u2019', "'").replace('\u2018', "'")
    s = re.sub(r'\s+', ' ', s)
    s = s.rstrip(' :;.')
    return s


_RAW_DICT = {
    "nta gisubizo cy'ukuri kirimo": "None of the above is correct",
    "nta gisubizo cy'ukuri": "None of the above is correct",
    "ntagisubizo cy'ukuri kirimo": "None of the above is correct",
    "ntagisubizo cy'ukuri": "None of the above is correct",
    "ntagisuzo cy'ukuri kirimo": "None of the above is correct",
    "nta gisubizo cyukuri kirimo": "None of the above is correct",
    "a na b ni ibisubizo by'ukuri": "A and B are both correct",
    "b na c ni ibisubizo by'ukuri": "B and C are both correct",
    "b na c ni ibisubizo byukuri": "B and C are both correct",
    "a na c ni ibisubizo by'ukuri": "A and C are both correct",
    "a na b ni byo": "A and B are both correct",
    "ibisubizo byose ni ukuri": "All of the above are correct",
    "ibisubizo byose nibyo": "All of the above are correct",
    "ibisubizo byose ni byo": "All of the above are correct",
    "ibi bisubizo byose nibyo": "All of the above are correct",
    "byose ni ibisubizo by'ukuri": "All of the above are correct",
    "iki cyapa gisobanura iki ?": "What does this sign mean?",
    "iki cyapa gisobanura iki?": "What does this sign mean?",
    "iki cyapa kivuga:": "This sign means:",
    "iki cyapa kivuga :": "This sign means:",
    "iki cyapa gisobanura :": "This sign means:",
    "iki cyapa cyerekana iki ?": "What does this sign show?",
    "iki cyapa cyerekana iki?": "What does this sign show?",
    "iki cyapa:": "This sign:",
    "iki kimenyetso kiri mu muhanda kivuze iki ?": "What does this road marking mean?",
    "umweru": "white", "umutuku": "red", "umukara": "black", "ubururu": "blue",
    "umuhondo": "yellow", "icyatsi": "green", "icyatsi kibisi": "green",
    "umweru n'umukara": "white and black", "umweru n'umutuku": "white and red",
    "umweru n'umuhondo": "white and yellow", "umutuku n'umukara": "red and black",
    "ubururu n'umweru": "blue and white", "umukara n'umweru": "black and white",
    "yego": "yes", "oya": "no",
    "yego,": "yes",
    "velomoteri": "moped", "ipikipiki": "motorcycle",
    "ipikipiki idafite akanyabiziga ku ruhande": "a motorcycle without a sidecar",
    "ipikipiki ifite akanyabiziga ku ruhande": "a motorcycle with a sidecar",
    "feri y'urugendo": "service brake", "feri yo guhagarara": "parking brake",
    "feri yo guhagarara umwanya munini": "parking brake",
    "feri yo gutabara": "emergency brake",
    "itara ndangamubyimba": "clearance (width marker) light",
    "itara ndangaburumbarare": "outline marker light",
    "itara ndanga": "marker light",
    "ibinyabiziga bya police": "police vehicles",
    "ibinyabiziga ndakumirwa": "priority (right-of-way) vehicles",
    "umunyamaguru": "a pedestrian",
    "umuvuduko ntarengwa wemewe": "the permitted maximum speed",
    "umuvuduko ntarengwa": "maximum speed",
    "aho banyura bazengurutse": "a roundabout",
    "umuyaga w'intambike": "crosswind",
    "ukugendera mu muhanda ubisikanirwamo": "two-way traffic on the road",
    "iburyo": "right", "ibumoso": "left",
    "umuhanda unyerera": "a slippery road",
    "umuhanda utaringaniye": "an uneven road",
    "umuhanda udakomeza": "the road does not continue (dead end)",
    "ntihanyurwa": "no entry / not passable",
    "birabujijwe kunyuranaho": "overtaking is forbidden",
    "kunyuranaho ntibyemewe": "overtaking is not allowed",
    "birabujijwe guhindukira": "u-turns are forbidden",
    "kuvuza ihoni": "sound the horn",
    "aho imihanda ihurira": "where roads meet (a junction)",
    "ahantu umuhanda umeze nabi": "a place where the road surface is in poor condition",
    "akazamuko gashinze cyane": "a steep uphill climb",
    "guhagararwamo umwanya muto gusa": "only a brief stop is allowed",
    "hafi y'inguni y'ibumoso bw'ikinyabiziga": "near the left-hand corner of the vehicle",
    "inyuma ahegereye inguni y'iburyo": "at the rear, near the right-hand corner",
    "kwitaba cyangwa guhagarara ako kanya": "answer it or stop immediately",
    "kutayitaba": "not answer it",
    "gushyira imodoka iruhande ukayitaba": "pull the car over and then answer it",
    "mu gihe telefone yawe ihamagawe utwaye imodoka wakora iki?": "What should you do if your phone rings while you are driving?",
    "kugabanya umuvuduko witegura guhagarara": "slow down and prepare to stop",
    "umuyobozi w'ikinyabiziga agomba kugabanya umuvuduko no gutambukana ubwitonzi": "The driver must slow down and pass carefully",
    "ibinyabiziga bigenewe gutwara ibintu birengeje toni 3.5": "vehicles intended to carry loads over 3.5 tonnes",
    "ibinyabiziga bigenewe kwigisha gutwara": "vehicles used for driving instruction",
    "ishusho y'uruziga mw'ibara ritukura, ubuso bwera n'ikirango cy'umukara": "a red circle, with a white background and a black symbol",
    "ishusho ya mpandeshatu mw'ibara ritukura, ubuso bwera n'ikirango cy'umukara": "a red triangle, with a white background and a black symbol",
    "ishusho ya mpandeshatu mw'ibara ritukura, ubuso bw'ubururu n'ikirango cy'umukara": "a red triangle, with a blue background and a black symbol",
    "ishusho y'uruziga mw'ibara ritukura, ubuso bw'ubururu n'ikirango cy'umukara": "a red circle, with a blue background and a black symbol",
    # "Ahanyurwa n'X" (used/passed through by X) mistranslates as "Satisfied
    # with X" in MT; hand-fixed for the specific recurring phrases.
    "ahanyurwa n'amagare na velomoteri": "used by bicycles and mopeds",
    "ahanyurwa n'ingorofani": "used by handcarts",
    "ahanyurwa n'ibinyamitende": "used by wheeled vehicles",
    "ahanyurwa n'abanyamaguru": "used by pedestrians",
    "ahanyurwa n'ingorofani n'ibinyamitende": "used by handcarts and wheeled vehicles",
    "ahanyurwa n'inyamaswa": "used by animals",
}
BOILERPLATE_DICT = {norm(k): v for k, v in _RAW_DICT.items()}

# icyapa/sign codes like "Icyapa A19", "Icyapa B6" - translate the label word only
SIGN_CODE_RE = re.compile(r"^icyapa\s+([a-z]\.?\d+[a-z]?)$", re.I)


def try_boilerplate(text):
    n = norm(text)
    if n in BOILERPLATE_DICT:
        return BOILERPLATE_DICT[n]
    m = SIGN_CODE_RE.match(text.strip())
    if m:
        return f"Sign {m.group(1).upper()}"
    return None


# ---------------------------------------------------------------------------
# 3. Pre-translation source substitutions for known MT failure modes.
#    Verified individually against Google Translate before inclusion.
# ---------------------------------------------------------------------------
SOURCE_SUBS = [
    # "ikinyamitende"/"ibinyamitende" (wheeled/tired vehicle) -> MT mistranslates
    # as "palm tree". Substitute an unambiguous paraphrase that MT handles well.
    (re.compile(r'\bibinyamitende\b', re.I), "ibinyabiziga bifite amapine"),
    (re.compile(r'\bikinyamitende\b', re.I), "ikinyabiziga gifite amapine"),
    # "ureba kure" (to see far) alone mistranslates as "look away"; "kubona
    # kure" is a safe synonym that MT renders correctly as "see far".
    (re.compile(r'\bureba\s+kure\b', re.I), "kubona kure"),
    (re.compile(r'\bkureba\s+kure\b', re.I), "kubona kure"),
    # isolated short "Umuyobozi (w'ikinyabiziga)" as a bare noun-phrase answer
    # (no verb) gets mistranslated as "Director"/"Vehicle manager". Only apply
    # when it's the *entire* (short) option text, not inside a full sentence
    # that already has a verb (those translate correctly as "the driver").
]


def apply_source_subs(text):
    out = text
    for pattern, repl in SOURCE_SUBS:
        out = pattern.sub(repl, out)
    # Short standalone "Umuyobozi" / "Umuyobozi w'ikinyabiziga" style answers
    # (<=5 words, no verb-like word) - swap for a verb-based phrase that MT
    # reliably translates to "driver".
    stripped = out.strip()
    word_count = len(stripped.split())
    if word_count <= 5 and re.search(r'\bumuyobozi\b', stripped, re.I) and not re.search(
            r'agomba|ashobora|akora|yakora|agiye|arimo|afite', stripped, re.I):
        out = re.sub(r"umuyobozi\s+w['\u2019]ikinyabiziga", "uwuyobora ikinyabiziga", out, flags=re.I)
        out = re.sub(r"^umuyobozi$", "uwuyobora ikinyabiziga", out.strip(), flags=re.I)
    return out


# ---------------------------------------------------------------------------
# 4. MT fallback with disk cache.
# ---------------------------------------------------------------------------
def load_cache():
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_cache(cache):
    with open(CACHE_PATH, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=0)


# Known residual MT error strings -> corrected English, applied as a final
# safety-net pass on whatever MT returns (belt-and-braces on top of the
# source substitutions above).
POST_FIXES = [
    (re.compile(r'\bVehicle manager\b', re.I), "the vehicle's driver"),
    (re.compile(r'^Director$', re.I), "Driver"),
    (re.compile(r'\bDirector of the vehicle\b', re.I), "driver of the vehicle"),
]


def post_fix(text):
    out = text
    for pattern, repl in POST_FIXES:
        out = pattern.sub(repl, out)
    return out


def translate_one(text, cache, stats):
    if not text or not text.strip():
        return text
    direct = try_numeric(text)
    if direct:
        stats['numeric'] += 1
        return direct
    direct = try_boilerplate(text)
    if direct:
        stats['boilerplate'] += 1
        return direct
    key = norm(text)
    if key in cache:
        stats['cached'] += 1
        return cache[key]

    src = apply_source_subs(text)
    for attempt in range(4):
        try:
            result = translator.translate(src)
            break
        except Exception as e:
            wait = 2 * (attempt + 1)
            print(f"  retry after error: {e} (waiting {wait}s)")
            time.sleep(wait)
    else:
        result = text  # give up, keep original as last resort

    result = post_fix(result)
    cache[key] = result
    stats['mt'] += 1
    return result


def main():
    with open(IN_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    cache = load_cache()
    stats = {'numeric': 0, 'boilerplate': 0, 'cached': 0, 'mt': 0}

    total = len(data)
    for i, q in enumerate(data):
        en_text = translate_one(q['text'], cache, stats)
        en_options = []
        for o in q['options']:
            en_options.append({
                'letter': o['letter'],
                'text': translate_one(o['text'], cache, stats) if o['text'] else '',
            })
        q['en'] = {'text': en_text, 'options': en_options}

        if (i + 1) % 20 == 0 or i + 1 == total:
            save_cache(cache)
            print(f"[{i+1}/{total}] numeric={stats['numeric']} boilerplate={stats['boilerplate']} "
                  f"cached={stats['cached']} mt={stats['mt']}")

    save_cache(cache)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("DONE", stats)


if __name__ == '__main__':
    main()
