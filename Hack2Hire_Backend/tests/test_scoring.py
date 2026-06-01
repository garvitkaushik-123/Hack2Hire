from services.scoring import apply_time_penalty, check_termination, is_empty_answer


class TestTimePenalty:
    def test_within_time_no_penalty(self):
        assert apply_time_penalty(80, 90) == 80

    def test_at_exactly_120_no_penalty(self):
        assert apply_time_penalty(80, 120) == 80

    def test_over_time_applies_0_7_multiplier(self):
        assert apply_time_penalty(100, 121) == 70

    def test_over_time_rounds_down(self):
        assert apply_time_penalty(85, 130) == 59


class TestEmptyAnswer:
    def test_empty_string(self):
        assert is_empty_answer("") is True

    def test_whitespace_only(self):
        assert is_empty_answer("     ") is True

    def test_short_answer(self):
        assert is_empty_answer("idk") is True

    def test_valid_answer(self):
        assert is_empty_answer("This is a real answer") is False

    def test_exactly_10_chars(self):
        assert is_empty_answer("abcdefghij") is False


class TestTermination:
    def test_three_consecutive_low_scores_terminates(self):
        result = check_termination(consecutive_low_scores=3, scores=[25, 28, 22])
        assert result is not None
        assert "Consistent low performance" in result

    def test_two_consecutive_low_scores_no_termination(self):
        assert check_termination(consecutive_low_scores=2, scores=[25, 28]) is None

    def test_avg_below_25_after_3_questions_terminates(self):
        result = check_termination(consecutive_low_scores=0, scores=[20, 24, 22])
        assert result is not None
        assert "below threshold" in result

    def test_avg_below_25_with_only_2_questions_no_termination(self):
        assert check_termination(consecutive_low_scores=0, scores=[20, 24]) is None

    def test_good_scores_no_termination(self):
        assert check_termination(consecutive_low_scores=0, scores=[70, 65, 80]) is None
