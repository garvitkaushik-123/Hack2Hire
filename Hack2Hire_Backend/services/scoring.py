def apply_time_penalty(score: int, time_taken: int) -> int:
    """Apply the 30 percent timer-expiry penalty for answers over 120 seconds."""
    if time_taken > 120:
        return int(score * 0.7)
    return score


def is_empty_answer(answer_text: str) -> bool:
    """Treat answers with fewer than 10 non-whitespace chars as empty."""
    return len("".join(answer_text.split())) < 10


def check_termination(consecutive_low_scores: int, scores: list[int]) -> str | None:
    """Return an early termination reason when low-score rules are met."""
    if consecutive_low_scores >= 3:
        return "Consistent low performance"

    if len(scores) >= 3 and sum(scores) / len(scores) < 25:
        return "Overall performance below threshold"

    return None
