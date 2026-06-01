import pytest

from models.interview_state import CATEGORY_ROTATION, InterviewSession


def test_category_rotation_uses_one_based_question_numbers():
    session = InterviewSession()

    for index, expected_category in enumerate(CATEGORY_ROTATION, start=1):
        assert session.get_category_for_question(index) == expected_category


def test_category_rotation_rejects_zero_index():
    session = InterviewSession()

    with pytest.raises(ValueError):
        session.get_category_for_question(0)
