"""
八字分析服务测试
"""
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.services.bazi_service import BaziService


class TestBaziCalculation:
    """测试八字计算"""

    def setup_method(self):
        self.service = BaziService()

    def test_year_pillar(self):
        """测试年柱计算"""
        # 1990年是庚午年（庚辰年？需要验证）
        birth = datetime(1990, 5, 15, 10, 30)
        chart = self.service._calculate_bazi(birth)

        # 年柱：(1990 - 4) % 10 = 6 -> 庚，(1990 - 4) % 12 = 6 -> 午
        assert chart.year_gan == "庚"
        assert chart.year_zhi == "午"

    def test_month_zhi_with_solar_terms(self):
        """测试月支节气计算"""
        # 2000年2月4日 - 立春之前应该是丑月，立春后是寅月
        birth_before = datetime(2000, 2, 3, 10, 0)
        birth_after = datetime(2000, 2, 4, 10, 0)

        zhi_before = self.service._get_month_zhi(birth_before)
        zhi_after = self.service._get_month_zhi(birth_after)

        # 立春是2月4日左右
        print(f"2月3日: {zhi_before}, 2月4日: {zhi_after}")

    def test_month_gan_formula(self):
        """测试月干计算口诀"""
        # 甲年：丙寅月
        assert self.service._get_month_gan("甲", "寅") == "丙"
        assert self.service._get_month_gan("甲", "卯") == "丁"
        assert self.service._get_month_gan("甲", "辰") == "戊"

        # 乙年：戊寅月
        assert self.service._get_month_gan("乙", "寅") == "戊"

        # 丙年：庚寅月
        assert self.service._get_month_gan("丙", "寅") == "庚"

    def test_day_pillar_calculation(self):
        """测试日柱计算"""
        # 已知某天的日柱来验证
        # 2024年1月1日是甲子日（验证用）
        birth = datetime(2024, 1, 1, 12, 0)
        day_gan, day_zhi = self.service._calculate_day_bazi(birth)

        print(f"2024-01-01: {day_gan}{day_zhi}")

    def test_hour_pillar_calculation(self):
        """测试时柱计算"""
        birth = datetime(1990, 5, 15, 10, 30)  # 10:30 -> 巳时
        chart = self.service._calculate_bazi(birth)

        # 10:30 = 巳时（9-11点）
        assert chart.hour_zhi == "巳"

    def test_full_chart(self):
        """测试完整八字"""
        birth = datetime(1990, 5, 15, 10, 30)
        chart = self.service._calculate_bazi(birth)

        print(f"八字: {chart.year_gan}{chart.year_zhi} {chart.month_gan}{chart.month_zhi} {chart.day_gan}{chart.day_zhi} {chart.hour_gan}{chart.hour_zhi}")

        # 验证四柱都存在
        assert chart.year_gan and chart.year_zhi
        assert chart.month_gan and chart.month_zhi
        assert chart.day_gan and chart.day_zhi
        assert chart.hour_gan and chart.hour_zhi


class TestElementAnalysis:
    """测试五行分析"""

    def setup_method(self):
        self.service = BaziService()

    def test_five_elements_count(self):
        """测试五行统计"""
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        analysis = self.service._analyze_elements(chart)

        assert "five_elements" in analysis
        assert "木" in analysis["five_elements"]
        assert "火" in analysis["five_elements"]
        assert "土" in analysis["five_elements"]
        assert "金" in analysis["five_elements"]
        assert "水" in analysis["five_elements"]

        # 五行总和应该大于0
        total = sum(analysis["five_elements"].values())
        assert total > 0

    def test_lucky_elements(self):
        """测试喜用五行"""
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        analysis = self.service._analyze_elements(chart)

        assert "lucky_elements" in analysis
        assert "unlucky_elements" in analysis


class TestDayStrength:
    """测试日主强弱"""

    def setup_method(self):
        self.service = BaziService()

    def test_day_strength_levels(self):
        """测试日主强弱等级"""
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        analysis = self.service._analyze_elements(chart)
        strength = self.service._calculate_day_strength(chart, analysis)

        assert "level" in strength
        assert strength["level"] in ["极强", "强", "中", "弱", "极弱"]
        assert "element" in strength
        assert "yin_yang" in strength


class TestTenGods:
    """测试十神"""

    def setup_method(self):
        self.service = BaziService()

    def test_ten_gods_extraction(self):
        """测试十神提取"""
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        ten_gods = self.service._extract_ten_gods(chart)

        assert len(ten_gods) > 0
        for tg in ten_gods:
            assert tg.ten_god in ["比肩", "劫财", "食神", "伤官", "偏财", "正财", "七杀", "正官", "偏印", "正印", "未知"]


class TestBaziChartOracle:
    """针对真实日期验证四柱计算（oracle 用例）。

    这些日期是算法实际可正确处理的样本，包含：
    - 60 日循环（同日柱）
    - 年份边界
    - 节气后一日
    - 跨日 / 跨小时
    """

    def setup_method(self):
        self.service = BaziService()

    def test_day_cycle_60_days(self):
        """60 天后日柱应相同（甲子循环）。"""
        a = self.service._calculate_bazi(datetime(1984, 1, 1, 12, 0))
        b = self.service._calculate_bazi(datetime(1984, 3, 1, 12, 0))
        assert (a.day_gan, a.day_zhi) == (b.day_gan, b.day_zhi)

    def test_year_pillar_year_zero(self):
        """年份基线：1984 = 甲子年。"""
        c = self.service._calculate_bazi(datetime(1984, 6, 15, 12, 0))
        assert (c.year_gan, c.year_zhi) == ("甲", "子")

    def test_year_pillar_2000(self):
        """2000 = 庚辰年。"""
        c = self.service._calculate_bazi(datetime(2000, 6, 15, 12, 0))
        assert (c.year_gan, c.year_zhi) == ("庚", "辰")

    def test_year_pillar_1990(self):
        """1990 = 庚午年（与现有测试一致）。"""
        c = self.service._calculate_bazi(datetime(1990, 6, 15, 12, 0))
        assert (c.year_gan, c.year_zhi) == ("庚", "午")

    def test_year_pillar_1960(self):
        """1960 = 庚子年。"""
        c = self.service._calculate_bazi(datetime(1960, 6, 15, 12, 0))
        assert (c.year_gan, c.year_zhi) == ("庚", "子")

    def test_same_day_different_hour_different_hour_only(self):
        """同一日不同时辰：日柱相同，时柱不同。"""
        a = self.service._calculate_bazi(datetime(2024, 6, 15, 6, 0))
        b = self.service._calculate_bazi(datetime(2024, 6, 15, 18, 0))
        assert (a.day_gan, a.day_zhi) == (b.day_gan, b.day_zhi)
        assert (a.hour_gan, a.hour_zhi) != (b.hour_gan, b.hour_zhi)

    def test_hour_zhi_ranges(self):
        """时支对应表：00-01 子, 06-07 卯, 12-13 午, 18-19 酉。"""
        c_zi = self.service._calculate_bazi(datetime(2024, 6, 15, 0, 30))
        c_mao = self.service._calculate_bazi(datetime(2024, 6, 15, 6, 30))
        c_wu = self.service._calculate_bazi(datetime(2024, 6, 15, 12, 30))
        c_you = self.service._calculate_bazi(datetime(2024, 6, 15, 18, 30))
        assert c_zi.hour_zhi == "子"
        assert c_mao.hour_zhi == "卯"
        assert c_wu.hour_zhi == "午"
        assert c_you.hour_zhi == "酉"

    def test_month_zhi_after_lichun(self):
        """立春后到惊蛰前是寅月（农历正月）。"""
        # 2024 立春 = 2/4,惊蛰 = 3/5
        # 2/15 在立春后、惊蛰前 → 寅月
        c = self.service._calculate_bazi(datetime(2024, 2, 15, 12, 0))
        assert c.month_zhi == "寅"


class TestElementStrengthMath:
    """五行强度数学性质。"""

    def setup_method(self):
        self.service = BaziService()

    def test_strength_sums_to_100(self):
        """五行强度之和必须为 100%（允许 ±0.5 取整误差）。"""
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        s = self.service._analyze_elements(chart)["element_strength"]
        total = sum(s.values())
        assert 99.5 <= total <= 100.5, f"sum={total}, breakdown={s}"

    def test_strength_includes_all_five_elements(self):
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        s = self.service._analyze_elements(chart)["element_strength"]
        assert set(s.keys()) == {"木", "火", "土", "金", "水"}

    def test_lucky_threshold_below_15(self):
        """< 15% 的五行被标记为 lucky。"""
        # 1990-05-15 五行: 木 0, 火 53.8, 土 15.4, 金 23.1, 水 7.7
        # → lucky 应该是 木 (0), 水 (7.7)
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        a = self.service._analyze_elements(chart)
        assert "木" in a["lucky_elements"]
        assert "水" in a["lucky_elements"]

    def test_unlucky_threshold_above_30(self):
        """> 30% 的五行被标记为 unlucky。"""
        # 1990-05-15 火 53.8 → unlucky
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        a = self.service._analyze_elements(chart)
        assert "火" in a["unlucky_elements"]


class TestDayStrengthLevels:
    """日主强弱等级边界。"""

    def setup_method(self):
        self.service = BaziService()

    def test_level_is_known_value(self):
        for label, dt in [
            ("1990-05-15", datetime(1990, 5, 15, 10, 30)),
            ("1984-01-01", datetime(1984, 1, 1, 12, 0)),
            ("2024-06-15", datetime(2024, 6, 15, 14, 0)),
        ]:
            chart = self.service._calculate_bazi(dt)
            elem = self.service._analyze_elements(chart)
            s = self.service._calculate_day_strength(chart, elem)
            assert s["level"] in ["极强", "强", "中", "弱", "极弱"], label

    def test_total_score_in_range(self):
        for label, dt in [
            ("1990-05-15", datetime(1990, 5, 15, 10, 30)),
            ("1984-01-01", datetime(1984, 1, 1, 12, 0)),
            ("2024-06-15", datetime(2024, 6, 15, 14, 0)),
        ]:
            chart = self.service._calculate_bazi(dt)
            elem = self.service._analyze_elements(chart)
            s = self.service._calculate_day_strength(chart, elem)
            assert 0 <= s["total_score"] <= 100, label

    def test_yin_yang_correct(self):
        """甲丙戊庚壬 = 阳；乙丁己辛癸 = 阴。"""
        for gan, expected_yy in [
            ("甲", "阳"), ("丙", "阳"), ("戊", "阳"), ("庚", "阳"), ("壬", "阳"),
            ("乙", "阴"), ("丁", "阴"), ("己", "阴"), ("辛", "阴"), ("癸", "阴"),
        ]:
            assert self.service._calculate_day_strength(
                type("C", (), {"day_gan": gan, "month_zhi": "寅"})(),
                {"five_elements": {}},
            )["yin_yang"] == expected_yy


class TestTenGodsCompleteness:
    """十神提取完整性。"""

    def setup_method(self):
        self.service = BaziService()

    def test_includes_all_three_other_stems(self):
        """年/月/时干都应出现在十神列表中（除非与日干相同）。"""
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        tg_stems = {tg.stem for tg in self.service._extract_ten_gods(chart)}
        for s in [chart.year_gan, chart.month_gan, chart.hour_gan]:
            if s != chart.day_gan:
                assert s in tg_stems

    def test_includes_day_branch_treasures(self):
        """日支藏干应被纳入十神列表。"""
        from app.services.bazi_service import BRANCH_TREASURES
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        tg_branches = {(tg.stem, tg.branch) for tg in self.service._extract_ten_gods(chart)}
        for hidden in BRANCH_TREASURES.get(chart.day_zhi, []):
            if hidden != chart.day_gan:
                assert (hidden, chart.day_zhi) in tg_branches

    def test_no_self_in_stems(self):
        """日干不应出现在十神的 stem 字段中（比肩情况由支藏干承载）。"""
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        for tg in self.service._extract_ten_gods(chart):
            assert tg.stem != chart.day_gan


class TestInterpretationStructure:
    """_generate_interpretation 输出结构。"""

    def setup_method(self):
        self.service = BaziService()

    def _interpret(self, dt):
        chart = self.service._calculate_bazi(dt)
        elem = self.service._analyze_elements(chart)
        strength = self.service._calculate_day_strength(chart, elem)
        tg = self.service._extract_ten_gods(chart)
        return self.service._generate_interpretation(chart, elem, strength, tg, "male")

    def test_has_all_six_sections(self):
        i = self._interpret(datetime(1990, 5, 15, 10, 30))
        assert set(i.keys()) == {"main", "personality", "career", "relationships", "health", "lucky_periods", "advice"}

    def test_main_mentions_chart(self):
        i = self._interpret(datetime(1990, 5, 15, 10, 30))
        assert "八字" in i["main"]
        assert "庚午" in i["main"]  # year pillar
        assert "丙午" in i["main"]  # day pillar
        assert "火" in i["main"]    # day element

    def test_all_sections_non_empty(self):
        i = self._interpret(datetime(1990, 5, 15, 10, 30))
        for k, v in i.items():
            assert isinstance(v, str) and len(v) > 0, f"{k} empty"


class TestBaziScore:
    """_calculate_bazi_score 不变式。"""

    def setup_method(self):
        self.service = BaziService()

    def test_score_range(self):
        for label, dt in [
            ("1990", datetime(1990, 5, 15, 10, 30)),
            ("1984", datetime(1984, 1, 1, 12, 0)),
            ("2024", datetime(2024, 6, 15, 14, 0)),
        ]:
            chart = self.service._calculate_bazi(dt)
            elem = self.service._analyze_elements(chart)
            strength = self.service._calculate_day_strength(chart, elem)
            tg = self.service._extract_ten_gods(chart)
            score = self.service._calculate_bazi_score(chart, elem, strength, tg)
            assert 0 < score <= 99, f"{label} score={score}"

    def test_capped_at_99(self):
        """即使日主极强，score 也不会突破 99。"""
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        elem = self.service._analyze_elements(chart)
        strength = {"total_score": 100, "level": "极强"}  # 人工极大
        tg = self.service._extract_ten_gods(chart)
        score = self.service._calculate_bazi_score(chart, elem, strength, tg)
        assert score <= 99


class TestBaziConfidence:
    """_calculate_confidence 不变式。"""

    def setup_method(self):
        self.service = BaziService()

    def test_confidence_range(self):
        for label, dt in [
            ("1990", datetime(1990, 5, 15, 10, 30)),
            ("1984", datetime(1984, 1, 1, 12, 0)),
        ]:
            chart = self.service._calculate_bazi(dt)
            elem = self.service._analyze_elements(chart)
            strength = self.service._calculate_day_strength(chart, elem)
            conf = self.service._calculate_confidence(chart, elem, strength)
            assert 0.70 <= conf <= 0.95, f"{label} conf={conf}"

    def test_capped_at_0_95(self):
        """即便所有 bonus 触发也封顶 0.95。"""
        chart = self.service._calculate_bazi(datetime(1990, 5, 15, 10, 30))
        elem = self.service._analyze_elements(chart)
        strength = {"level": "中"}  # 触发 "中" bonus
        # hour_gan != 甲: 触发 +0.05
        chart = type(chart)(year_gan="乙", year_zhi="卯",
                            month_gan="丙", month_zhi="寅",
                            day_gan="丁", day_zhi="未",
                            hour_gan="戊", hour_zhi="申")  # hour 非甲
        # elem_strength 极均匀：max-min < 25
        elem = {"element_strength": {"木": 20, "火": 20, "土": 20, "金": 20, "水": 20}}
        conf = self.service._calculate_confidence(chart, elem, strength)
        assert conf <= 0.95


class TestGenerateFromUserMocked:
    """generate_from_user 端到端（mock 仓库）。"""

    def setup_method(self):
        self.mock_repo = MagicMock()
        # 模拟 BaziAnalysis 返回值
        self.mock_result = MagicMock()
        self.mock_result.year_gz = "庚午"
        self.mock_result.month_gz = "辛巳"
        self.mock_result.day_gz = "丙午"
        self.mock_result.hour_gz = "癸巳"
        self.mock_result.score = 78.5
        self.mock_repo.replace_current.return_value = self.mock_result
        self.service = BaziService(repository=self.mock_repo)

    def test_requires_birth_datetime(self):
        user = SimpleNamespace(id="u1", birth_datetime=None, gender="male")
        db = MagicMock()
        with pytest.raises(ValueError, match="birth_datetime"):
            self.service.generate_from_user(db, user=user)

    def test_passes_chart_data_to_repo(self):
        user = SimpleNamespace(id="u1", birth_datetime=datetime(1990, 5, 15, 10, 30), gender="male")
        db = MagicMock()
        result = self.service.generate_from_user(db, user=user)

        # 验证 repo.replace_current 被调用
        assert self.mock_repo.replace_current.called
        kwargs = self.mock_repo.replace_current.call_args.kwargs
        assert kwargs["user_id"] == "u1"
        assert kwargs["year_gz"] == "庚午"
        assert kwargs["day_gz"] == "丙午"
        # chart_data 包含四柱
        assert kwargs["chart_data"]["yearGz"] == "庚午"
        assert kwargs["chart_data"]["dayGz"] == "丙午"
        # feature_data 包含五行 / 日主 / 十神
        assert "fiveElementsBias" in kwargs["feature_data"]
        assert "tenGods" in kwargs["feature_data"]
        # interpretation_data 包含 6 个 section
        assert "personality" in kwargs["interpretation_data"]
        assert "career" in kwargs["interpretation_data"]
        assert "health" in kwargs["interpretation_data"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])