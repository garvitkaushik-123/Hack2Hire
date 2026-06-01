def get_next_difficulty(current_difficulty: str, score: int) -> str:
    """Return the next difficulty using the deterministic TakeOff rules."""
    normalized = current_difficulty.lower()

    if normalized == "easy":
        return "medium" if score > 70 else "easy"

    if normalized == "medium":
        if score > 70:
            return "hard"
        if score < 40:
            return "easy"
        return "medium"

    if normalized == "hard":
        return "hard" if score > 70 else "medium"

    return current_difficulty
