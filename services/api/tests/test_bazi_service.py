"""
八字分析服务测试
"""
from datetime import datetime

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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])