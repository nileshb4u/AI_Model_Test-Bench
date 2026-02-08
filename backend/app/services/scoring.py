import re
from typing import Optional


def score_exact_match(output: str, expected: str) -> float:
    if output.strip().lower() == expected.strip().lower():
        return 10.0
    return 0.0


def score_contains(output: str, keywords: list[str]) -> float:
    if not keywords:
        return 0.0
    output_lower = output.lower()
    matched = sum(1 for kw in keywords if kw.lower() in output_lower)
    return round((matched / len(keywords)) * 10.0, 2)


def score_regex(output: str, pattern: str) -> float:
    try:
        if re.search(pattern, output, re.IGNORECASE | re.DOTALL):
            return 10.0
    except re.error:
        return 0.0
    return 0.0


def score_length_quality(output: str, min_len: int = 10) -> float:
    text = output.strip()
    if not text:
        return 0.0
    length = len(text)
    if length < min_len:
        return round((length / min_len) * 3.0, 2)
    if length < 50:
        return 4.0
    if length < 200:
        return 6.0
    if length < 1000:
        return 8.0
    return 9.0


def compute_quality_score(
    output: str,
    expected: Optional[str] = None,
    rubric: Optional[str] = None,
) -> tuple[float, str]:
    if not output or not output.strip():
        return 0.0, "empty_output"

    if expected:
        exact_score = score_exact_match(output, expected)
        if exact_score > 0:
            return exact_score, "exact_match"

        keywords = [kw.strip() for kw in expected.split(",") if kw.strip()]
        if len(keywords) > 1:
            contains_score = score_contains(output, keywords)
            if contains_score > 0:
                return contains_score, "keyword_match"

        contains_score = score_contains(output, [expected.strip()])
        if contains_score > 0:
            return contains_score, "substring_match"

    if rubric:
        rubric_stripped = rubric.strip()

        if rubric_stripped.startswith("regex:"):
            pattern = rubric_stripped[6:].strip()
            regex_score = score_regex(output, pattern)
            return regex_score, "regex_rubric"

        if rubric_stripped.startswith("contains:"):
            keywords_str = rubric_stripped[9:].strip()
            keywords = [kw.strip() for kw in keywords_str.split(",") if kw.strip()]
            return score_contains(output, keywords), "rubric_keywords"

        rubric_keywords = [kw.strip() for kw in rubric_stripped.split(",") if kw.strip()]
        if len(rubric_keywords) > 1:
            return score_contains(output, rubric_keywords), "rubric_keyword_match"

    return score_length_quality(output), "length_heuristic"


def normalize_scores(values: list[float], higher_is_better: bool = True) -> list[float]:
    if not values:
        return []
    filtered = [v for v in values if v is not None]
    if not filtered:
        return [0.0] * len(values)

    min_val = min(filtered)
    max_val = max(filtered)

    if max_val == min_val:
        return [5.0 if v is not None else 0.0 for v in values]

    result = []
    for v in values:
        if v is None:
            result.append(0.0)
        else:
            normalized = (v - min_val) / (max_val - min_val) * 10.0
            if not higher_is_better:
                normalized = 10.0 - normalized
            result.append(round(normalized, 2))
    return result


def compute_composite_score(
    quality_scores: list[float],
    speed_values: list[float],
    ram_values: list[float],
    weights: dict[str, float],
) -> float:
    w_quality = weights.get("quality", 0.5)
    w_speed = weights.get("speed", 0.3)
    w_efficiency = weights.get("efficiency", 0.2)

    avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.0

    norm_speed = normalize_scores(speed_values, higher_is_better=True)
    avg_speed = sum(norm_speed) / len(norm_speed) if norm_speed else 0.0

    norm_ram = normalize_scores(ram_values, higher_is_better=False)
    avg_efficiency = sum(norm_ram) / len(norm_ram) if norm_ram else 0.0

    composite = (w_quality * avg_quality) + (w_speed * avg_speed) + (w_efficiency * avg_efficiency)
    return round(composite, 2)
