from services.difficulty_adaptor import get_next_difficulty


class TestDifficultyAdaptor:
    def test_easy_strong_goes_to_medium(self):
        assert get_next_difficulty("easy", 85) == "medium"

    def test_easy_average_stays_easy(self):
        assert get_next_difficulty("easy", 55) == "easy"

    def test_easy_weak_stays_easy(self):
        assert get_next_difficulty("easy", 20) == "easy"

    def test_medium_strong_goes_to_hard(self):
        assert get_next_difficulty("medium", 75) == "hard"

    def test_medium_average_stays_medium(self):
        assert get_next_difficulty("medium", 50) == "medium"

    def test_medium_weak_goes_to_easy(self):
        assert get_next_difficulty("medium", 30) == "easy"

    def test_hard_strong_stays_hard(self):
        assert get_next_difficulty("hard", 80) == "hard"

    def test_hard_average_goes_to_medium(self):
        assert get_next_difficulty("hard", 60) == "medium"

    def test_hard_weak_goes_to_medium(self):
        assert get_next_difficulty("hard", 25) == "medium"

    def test_score_exactly_70_is_average(self):
        assert get_next_difficulty("easy", 70) == "easy"

    def test_score_71_is_strong(self):
        assert get_next_difficulty("easy", 71) == "medium"

    def test_score_exactly_40_is_average(self):
        assert get_next_difficulty("medium", 40) == "medium"

    def test_score_39_is_weak(self):
        assert get_next_difficulty("medium", 39) == "easy"
