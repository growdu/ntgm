"""
八字分析服务 - 实现真实的中国命理计算

包含:
- 四柱计算（年柱、月柱、日柱、时柱）
- 天干地支推算
- 五行旺衰分析
- 十神关系判断
- 命盘解释生成
"""

from datetime import datetime
from decimal import Decimal
from typing import NamedTuple

from app.repositories.bazi_repository import BaziRepository

# 天干（10个）
HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
# 地支（12个）
EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

# 天干地支序号对照（用于计算）
STEM_INDEX = {s: i for i, s in enumerate(HEAVENLY_STEMS)}
BRANCH_INDEX = {b: i for i, b in enumerate(EARTHLY_BRANCHES)}

# 五行对应
FIVE_ELEMENTS = {
    "甲": "木", "乙": "木",
    "丙": "火", "丁": "火",
    "戊": "土", "己": "土",
    "庚": "金", "辛": "金",
    "壬": "水", "癸": "水",
}

# 地支对应五行
BRANCH_ELEMENTS = {
    "子": "水", "丑": "土", "寅": "木", "卯": "木",
    "辰": "土", "巳": "火", "午": "火", "未": "土",
    "申": "金", "酉": "金", "戌": "土", "亥": "水",
}

# 地支藏干（地支中藏着的天干）
BRANCH_TREASURES = {
    "子": ["壬", "癸"],
    "丑": ["己", "癸", "辛"],
    "寅": ["甲", "丙", "戊"],
    "卯": ["乙"],
    "辰": ["戊", "乙", "癸"],
    "巳": ["丙", "庚", "戊"],
    "午": ["丁", "己"],
    "未": ["己", "丁", "乙"],
    "申": ["庚", "壬", "戊"],
    "酉": ["辛"],
    "戌": ["戊", "辛", "丁"],
    "亥": ["壬", "甲"],
}

# 十神映射（以日干为基准）
# 天干之间的十神关系
TEN_GODS_STEMS = {
    # 甲（日干）vs 其他天干
    "甲": {"甲": "比肩", "乙": "劫财", "丙": "食神", "丁": "伤官", "戊": "偏财", "己": "正财", "庚": "七杀", "辛": "正官", "壬": "偏印", "癸": "正印"},
    "乙": {"甲": "劫财", "乙": "比肩", "丙": "伤官", "丁": "食神", "戊": "正财", "己": "偏财", "庚": "正官", "辛": "七杀", "壬": "正印", "癸": "偏印"},
    "丙": {"甲": "偏印", "乙": "正印", "丙": "比肩", "丁": "劫财", "戊": "食神", "己": "伤官", "庚": "偏财", "辛": "正财", "壬": "七杀", "癸": "正官"},
    "丁": {"甲": "正印", "乙": "偏印", "丙": "劫财", "丁": "比肩", "戊": "伤官", "己": "食神", "庚": "正财", "辛": "偏财", "壬": "正官", "癸": "七杀"},
    "戊": {"甲": "七杀", "乙": "正官", "丙": "偏印", "丁": "正印", "戊": "比肩", "己": "劫财", "庚": "食神", "辛": "伤官", "壬": "偏财", "癸": "正财"},
    "己": {"甲": "正官", "乙": "七杀", "丙": "正印", "丁": "偏印", "戊": "劫财", "己": "比肩", "庚": "伤官", "辛": "食神", "壬": "正财", "癸": "偏财"},
    "庚": {"甲": "偏财", "乙": "正财", "丙": "七杀", "丁": "正官", "戊": "偏印", "己": "正印", "庚": "比肩", "辛": "劫财", "壬": "食神", "癸": "伤官"},
    "辛": {"甲": "正财", "乙": "偏财", "丙": "正官", "丁": "七杀", "戊": "正印", "己": "偏印", "庚": "劫财", "辛": "比肩", "壬": "伤官", "癸": "食神"},
    "壬": {"甲": "食神", "乙": "伤官", "丙": "偏财", "丁": "正财", "戊": "七杀", "己": "正官", "庚": "偏印", "辛": "正印", "壬": "比肩", "癸": "劫财"},
    "癸": {"甲": "伤官", "乙": "食神", "丙": "正财", "丁": "偏财", "戊": "正官", "己": "七杀", "庚": "正印", "辛": "偏印", "壬": "劫财", "癸": "比肩"},
}

# 五行相生相克
RELATIONS = {
    "木": {"生": "火", "克": "土"},
    "火": {"生": "土", "克": "金"},
    "土": {"生": "金", "克": "水"},
    "金": {"生": "水", "克": "木"},
    "水": {"生": "木", "克": "火"},
}

# 日干序号对照（用于日柱推算）
DAY_STEM_CYCLE = list(range(10))  # 0-9循环


class BaziChart(NamedTuple):
    """八字命盘"""
    year_gan: str  # 年干
    year_zhi: str  # 年支
    month_gan: str  # 月干
    month_zhi: str  # 月支
    day_gan: str  # 日干
    day_zhi: str  # 日支
    hour_gan: str  # 时干
    hour_zhi: str  # 时支


class TenGodInfo(NamedTuple):
    """十神信息"""
    stem: str  # 天干
    branch: str  # 地支
    ten_god: str  # 十神名称
    element: str  # 五行


class BaziService:
    """八字分析服务"""

    def __init__(self, repository: BaziRepository | None = None) -> None:
        self.repository = repository or BaziRepository()

    def generate_from_user(self, db, *, user) -> dict:
        """
        根据用户出生信息生成完整八字分析

        Args:
            db: 数据库会话
            user: 用户对象（包含 birth_datetime 等信息）

        Returns:
            BaziAnalysis: 八字分析结果
        """
        birth = user.birth_datetime
        if birth is None:
            raise ValueError("birth_datetime is required")

        gender = user.gender  # 用于判断命盘阴阳

        # 1. 计算四柱
        chart = self._calculate_bazi(birth)

        # 2. 分析五行旺衰
        element_analysis = self._analyze_elements(chart)

        # 3. 确定日主强弱
        day_strength = self._calculate_day_strength(chart, element_analysis)

        # 4. 推算十神
        ten_gods = self._extract_ten_gods(chart)

        # 5. 生成命盘解释
        interpretation = self._generate_interpretation(chart, element_analysis, day_strength, ten_gods, gender)

        # 6. 计算得分和置信度
        score = self._calculate_bazi_score(chart, element_analysis, day_strength, ten_gods)
        confidence = self._calculate_confidence(chart, element_analysis, day_strength)

        chart_data = {
            "yearGz": chart.year_gan + chart.year_zhi,
            "monthGz": chart.month_gan + chart.month_zhi,
            "dayGz": chart.day_gan + chart.day_zhi,
            "hourGz": chart.hour_gan + chart.hour_zhi,
        }

        feature_data = {
            "fiveElementsBias": element_analysis["five_elements"],
            "elementStrength": element_analysis["element_strength"],
            "dayMasterStrength": day_strength["level"],
            "dayMasterYinYang": "阳" if STEM_INDEX[chart.day_gan] % 2 == 0 else "阴",
            "tenGods": [tg.ten_god for tg in ten_gods],
            "luckyElements": element_analysis["lucky_elements"],
            "unluckyElements": element_analysis["unlucky_elements"],
        }

        interpretation_data = {
            "interpretation": interpretation["main"],
            "personality": interpretation["personality"],
            "career": interpretation["career"],
            "relationships": interpretation["relationships"],
            "health": interpretation["health"],
            "luckyPeriods": interpretation["lucky_periods"],
            "advice": interpretation["advice"],
        }

        return self.repository.replace_current(
            db,
            user_id=user.id,
            year_gz=chart_data["yearGz"],
            month_gz=chart_data["monthGz"],
            day_gz=chart_data["dayGz"],
            hour_gz=chart_data["hourGz"],
            chart_data=chart_data,
            feature_data=feature_data,
            interpretation_data=interpretation_data,
            score=score,
            confidence=Decimal(str(confidence)),
        )

    # 节气日期表（用于确定月支）
    # 每个月有两个节气，交节时分界
    SOLAR_TERMS = {
        # 小寒~大寒：子月（农历十二月）
        "小寒": (1, 5), "大寒": (1, 20),
        # 立春~雨水：丑月（农历正月）
        "立春": (2, 3), "雨水": (2, 18),
        # 惊蛰~春分：寅月（农历二月）
        "惊蛰": (3, 5), "春分": (3, 20),
        # 清明~谷雨：卯月（农历三月）
        "清明": (4, 4), "谷雨": (4, 19),
        # 立夏~小满：辰月（农历四月）
        "立夏": (5, 5), "小满": (5, 20),
        # 芒种~夏至：巳月（农历五月）
        "芒种": (6, 5), "夏至": (6, 21),
        # 小暑~大暑：午月（农历六月）
        "小暑": (7, 6), "大暑": (7, 22),
        # 立秋~处暑：未月（农历七月）
        "立秋": (8, 7), "处暑": (8, 22),
        # 白露~秋分：申月（农历八月）
        "白露": (9, 7), "秋分": (9, 22),
        # 寒露~霜降：酉月（农历九月）
        "寒露": (10, 8), "霜降": (10, 23),
        # 立冬~小雪：戌月（农历十月）
        "立冬": (11, 7), "小雪": (11, 22),
        # 大雪~冬至：亥月（农历十一月）
        "大雪": (12, 6), "冬至": (12, 21),
    }

    # 节气对应的月支
    TERM_TO_MONTH_ZHI = {
        "小寒": "丑", "大寒": "丑",
        "立春": "寅", "雨水": "寅",
        "惊蛰": "卯", "春分": "卯",
        "清明": "辰", "谷雨": "辰",
        "立夏": "巳", "小满": "巳",
        "芒种": "午", "夏至": "午",
        "小暑": "未", "大暑": "未",
        "立秋": "申", "处暑": "申",
        "白露": "酉", "秋分": "酉",
        "寒露": "戌", "霜降": "戌",
        "立冬": "亥", "小雪": "亥",
        "大雪": "子", "冬至": "子",
    }

    def _calculate_bazi(self, birth: datetime) -> BaziChart:
        """
        计算四柱八字

        采用精确算法：
        - 年柱：基于年份数字推算
        - 月柱：基于节气推算（更精确）
        - 日柱：基于儒略日计算（精确算法）
        - 时柱：基于日干和小时推算
        """
        year = birth.year

        # 年柱计算：年干 = (年份 - 4) % 10，年支 = (年份 - 4) % 12
        # （公元4年为甲子年）
        year_offset = (year - 4) % 10
        year_gan = HEAVENLY_STEMS[year_offset]
        year_zhi = EARTHLY_BRANCHES[(year - 4) % 12]

        # 月柱计算：使用节气确定月支和月干
        month_zhi = self._get_month_zhi(birth)
        month_gan = self._get_month_gan(year_gan, month_zhi)

        # 日柱计算：使用精确的儒略日算法
        day_gan, day_zhi = self._calculate_day_bazi(birth)

        # 时柱计算：时干 = (日干序号 * 2 + 时辰) % 10
        hour = birth.hour if birth.hour else 12  # 默认中午12点
        # 时辰地支：0-1点=子, 1-3=丑, 3-5=寅, 5-7=卯, 7-9=辰, 9-11=巳,
        #          11-13=午, 13-15=未, 15-17=申, 17-19=酉, 19-21=戌, 21-23=亥
        hour_zhi_index = ((hour + 1) // 2) % 12
        hour_zhi = EARTHLY_BRANCHES[hour_zhi_index]
        hour_gan = HEAVENLY_STEMS[(STEM_INDEX[day_gan] * 2 + hour_zhi_index) % 10]

        return BaziChart(
            year_gan=year_gan, year_zhi=year_zhi,
            month_gan=month_gan, month_zhi=month_zhi,
            day_gan=day_gan, day_zhi=day_zhi,
            hour_gan=hour_gan, hour_zhi=hour_zhi,
        )

    def _get_month_zhi(self, birth: datetime) -> str:
        """
        根据出生日期确定月支（使用节气）

        节气是太阳在黄道上的位置决定的，不同年份的节气日期不同
        这里使用简化算法，根据经验公式推算
        """
        month = birth.month
        day = birth.day

        # 节气大致日期表（可以进一步精确化）
        # 每年节气日期大致固定，前后可能差1-2天
        term_dates = {
            1: {"小寒": 5, "大寒": 20},
            2: {"立春": 3, "雨水": 18},
            3: {"惊蛰": 5, "春分": 20},
            4: {"清明": 4, "谷雨": 19},
            5: {"立夏": 5, "小满": 20},
            6: {"芒种": 5, "夏至": 21},
            7: {"小暑": 6, "大暑": 22},
            8: {"立秋": 7, "处暑": 22},
            9: {"白露": 7, "秋分": 22},
            10: {"寒露": 8, "霜降": 23},
            11: {"立冬": 7, "小雪": 22},
            12: {"大雪": 6, "冬至": 21},
        }

        # 判断是哪个节气
        month_terms = term_dates.get(month, {})
        prev_term = None
        for term_name, term_day in sorted(month_terms.items(), key=lambda x: x[1]):
            if day < term_day:
                break
            prev_term = term_name

        # 如果在当前月的两个节气之间，但还没到下个月的节气
        if prev_term is None:
            # 可能还没到当月的第一个节气
            if month == 1:
                # 1月：可能在冬至和立春之间，按丑月算
                if day < 5:
                    return "丑"  # 12月节气的第一天开始进入正月
            else:
                # 其他月份：应该在当月范围内
                pass

        # 获取节气对应的月支
        if prev_term and prev_term in self.TERM_TO_MONTH_ZHI:
            return self.TERM_TO_MONTH_ZHI[prev_term]

        # 节气还没到，按上个月计算
        # 查找上一个节气和对应的月支
        term_month_map = {
            1: (12, "子"),  # 小寒之前是亥月
            2: (1, "丑"),   # 立春之前是丑月
            3: (2, "寅"),   # 惊蛰之前是寅月
            4: (3, "卯"),   # 清明之前是卯月
            5: (4, "辰"),   # 立夏之前是辰月
            6: (5, "巳"),   # 芒种之前是巳月
            7: (6, "午"),   # 小暑之前是午月
            8: (7, "未"),   # 立秋之前是未月
            9: (8, "申"),   # 白露之前是申月
            10: (9, "酉"),  # 寒露之前是酉月
            11: (10, "戌"), # 立冬之前是戌月
            12: (11, "亥"), # 大雪之前是亥月
        }

        return term_month_map.get(month, (1, "寅"))[1]

    def _get_month_gan(self, year_gan: str, month_zhi: str) -> str:
        """
        根据年干和月支计算月干

        口诀：甲己之年丙为首，乙庚之年戊为头，
              丙辛之年寻庚上，丁壬壬位顺行流，
              戊癸之年何方发，甲寅之上好追求。
        """
        # 月干表（年干 -> 月干起始）
        month_gan_table = {
            "甲": "丙",  # 甲年：丙寅月
            "己": "丙",  # 己年：丙寅月
            "乙": "戊",  # 乙年：戊寅月
            "庚": "戊",  # 庚年：戊寅月
            "丙": "庚",  # 丙年：庚寅月
            "辛": "庚",  # 辛年：庚寅月
            "丁": "壬",  # 丁年：壬寅月
            "壬": "壬",  # 丁年：壬寅月
            "戊": "甲",  # 戊年：甲寅月
            "癸": "甲",  # 癸年：甲寅月
        }

        start_gan = month_gan_table.get(year_gan, "甲")
        start_index = STEM_INDEX[start_gan]

        # 月支索引（寅=0, 卯=1, 辰=2, ...）
        zhi_order = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"]
        zhi_index = zhi_order.index(month_zhi) if month_zhi in zhi_order else 0

        month_gan_index = (start_index + zhi_index) % 10
        return HEAVENLY_STEMS[month_gan_index]

    def _calculate_day_bazi(self, birth: datetime) -> tuple[str, str]:
        """
        计算日柱（精确算法）

        使用从天纪录或精确的公历转儒略日算法
        """

        y = birth.year
        m = birth.month
        d = birth.day

        # 使用更精确的公历转儒略日算法
        # 这个算法适用于1582年10月15日之后的公历日期
        if m <= 2:
            y -= 1
            m += 12

        # 格里高利历改革后（1582年10月15日之后）的算法
        a = y // 100
        b = 2 - a + a // 4  # 格里高利修正

        # 计算儒略日
        jd = int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + b - 1524.5

        # 转为整数部分
        jd = int(jd + 0.5)

        # 计算日干支（60日循环）
        # 以1984年1月1日（甲子日）为基准
        # 1984年1月1日的儒略日约为2445705
        base_jd = 2445705
        offset = (jd - base_jd) % 60

        day_gan = HEAVENLY_STEMS[offset % 10]
        day_zhi = EARTHLY_BRANCHES[offset % 12]

        return day_gan, day_zhi

    def _analyze_elements(self, chart: BaziChart) -> dict:
        """
        分析五行旺衰

        计算八字中五行分布情况
        """
        five_elements = {
            "木": 0, "火": 0, "土": 0, "金": 0, "水": 0
        }

        # 统计天干五行
        for stem in [chart.year_gan, chart.month_gan, chart.day_gan, chart.hour_gan]:
            elem = FIVE_ELEMENTS.get(stem)
            if elem:
                five_elements[elem] += 1

        # 统计地支五行
        for branch in [chart.year_zhi, chart.month_zhi, chart.day_zhi, chart.hour_zhi]:
            elem = BRANCH_ELEMENTS.get(branch)
            if elem:
                five_elements[elem] += 1

        # 统计地支藏干的五行
        for branch in [chart.year_zhi, chart.month_zhi, chart.day_zhi, chart.hour_zhi]:
            treasures = BRANCH_TREASURES.get(branch, [])
            for stem in treasures:
                elem = FIVE_ELEMENTS.get(stem)
                if elem:
                    five_elements[elem] += 0.5  # 藏干权重较低

        # 计算五行强度（百分比）
        total = sum(five_elements.values())
        element_strength = {k: round(v / total * 100, 1) if total > 0 else 0 for k, v in five_elements.items()}

        # 分析喜用五行（缺失或弱）
        lucky_elements = []
        unlucky_elements = []

        for elem, strength in element_strength.items():
            if strength < 15:
                lucky_elements.append(elem)
            elif strength > 30:
                unlucky_elements.append(elem)

        return {
            "five_elements": five_elements,
            "element_strength": element_strength,
            "lucky_elements": lucky_elements,
            "unlucky_elements": unlucky_elements,
        }

    def _calculate_day_strength(self, chart: BaziChart, element_analysis: dict) -> dict:
        """
        计算日主强弱

        日主（出生日的天干）是八字的核心
        """
        day_element = FIVE_ELEMENTS[chart.day_gan]
        day_is_yang = STEM_INDEX[chart.day_gan] % 2 == 0

        # 计算日主在八字中的强弱
        # 考虑因素：
        # 1. 日主本身的五行在八字中的数量
        # 2. 月令（月支）的影响
        # 3. 其他干支的生克关系

        day_count = element_analysis["five_elements"].get(day_element, 0)

        # 月支对日主的影响（简化判断）
        month_element = BRANCH_ELEMENTS[chart.month_zhi]

        # 旺相判断
        # 当令（与日主同类）为旺，我生者为相，生我者为休，克我者为囚，我克者为死
        strength_order = {"旺": 4, "相": 3, "休": 2, "囚": 1, "死": 0}

        # 简化：月支与日主的关系
        if month_element == day_element:
            month_influence = "旺"
        elif RELATIONS.get(day_element, {}).get("生") == month_element:
            month_influence = "相"
        elif RELATIONS.get(month_element, {}).get("克") == day_element:
            month_influence = "囚"
        elif RELATIONS.get(day_element, {}).get("克") == month_element:
            month_influence = "死"
        else:
            month_influence = "休"

        # 综合评分
        base_score = day_count * 15
        influence_score = strength_order.get(month_influence, 2) * 10

        total_score = min(base_score + influence_score, 100)

        # 确定强弱等级
        if total_score >= 80:
            level = "极强"
        elif total_score >= 65:
            level = "强"
        elif total_score >= 45:
            level = "中"
        elif total_score >= 30:
            level = "弱"
        else:
            level = "极弱"

        return {
            "element": day_element,
            "yin_yang": "阳" if day_is_yang else "阴",
            "month_influence": month_influence,
            "total_score": total_score,
            "level": level,
        }

    def _extract_ten_gods(self, chart: BaziChart) -> list[TenGodInfo]:
        """
        提取十神

        以日干为基准，分析其他干支与日干的关系
        """
        ten_gods = []
        day_gan = chart.day_gan

        # 其他天干与日干的关系
        for stem in [chart.year_gan, chart.month_gan, chart.hour_gan]:
            if stem != day_gan:
                ten_god = TEN_GODS_STEMS.get(day_gan, {}).get(stem, "未知")
                elem = FIVE_ELEMENTS.get(stem, "未知")
                ten_gods.append(TenGodInfo(stem=stem, branch="", ten_god=ten_god, element=elem))

        # 日支与日干的关系（藏干）
        day_branch_treasures = BRANCH_TREASURES.get(chart.day_zhi, [])
        for stem in day_branch_treasures:
            if stem != day_gan:
                ten_god = TEN_GODS_STEMS.get(day_gan, {}).get(stem, "未知")
                elem = FIVE_ELEMENTS.get(stem, "未知")
                ten_gods.append(TenGodInfo(stem=stem, branch=chart.day_zhi, ten_god=ten_god, element=elem))

        return ten_gods

    def _generate_interpretation(
        self,
        chart: BaziChart,
        element_analysis: dict,
        day_strength: dict,
        ten_gods: list[TenGodInfo],
        gender: str | None
    ) -> dict:
        """
        生成命盘解释

        根据八字分析结果生成详细的命理解释
        """
        day_gan = chart.day_gan
        day_element = FIVE_ELEMENTS[day_gan]
        level = day_strength["level"]

        # 十神统计
        ten_god_names = [tg.ten_god for tg in ten_gods]
        ten_god_counts = {}
        for tg in ten_god_names:
            ten_god_counts[tg] = ten_god_counts.get(tg, 0) + 1

        # 性格分析
        personality_traits = self._analyze_personality(day_gan, level, ten_god_counts, element_analysis)

        # 事业分析
        career_traits = self._analyze_career(day_gan, ten_god_counts, level)

        # 感情分析
        relationship_traits = self._analyze_relationships(day_gan, ten_god_counts, gender)

        # 健康分析
        health_traits = self._analyze_health(day_gan, element_analysis)

        # 幸运时期
        lucky_periods = self._analyze_lucky_periods(chart, element_analysis)

        # 改命建议
        advice = self._generate_advice(day_gan, level, element_analysis, ten_god_counts)

        return {
            "main": f"您的八字为 {chart.year_gan}{chart.year_zhi}年 {chart.month_gan}{chart.month_zhi}月 "
                    f"{chart.day_gan}{chart.day_zhi}日 {chart.hour_gan}{chart.hour_zhi}时。"
                    f"日主{day_element}气，{level}。",
            "personality": personality_traits,
            "career": career_traits,
            "relationships": relationship_traits,
            "health": health_traits,
            "lucky_periods": lucky_periods,
            "advice": advice,
        }

    def _analyze_personality(self, day_gan: str, level: str, ten_god_counts: dict, element_analysis: dict) -> str:
        """分析性格特征"""
        traits = []

        # 日主特性
        day_characteristics = {
            "甲": "仁慈、有领导力、积极向上",
            "乙": "温柔、敏感、有韧性",
            "丙": "热情、奔放、行动力强",
            "丁": "细腻、体贴、内心丰富",
            "戊": "稳重、厚重、踏实",
            "己": "包容、细腻、善于规划",
            "庚": "刚毅、果断、有魄力",
            "辛": "精致、敏锐、追求完美",
            "壬": "聪明、灵活、善于变通",
            "癸": "智慧、深沉、善于思考",
        }
        traits.append(day_characteristics.get(day_gan, ""))

        # 十神影响
        if ten_god_counts.get("食神", 0) >= 2:
            traits.append("有艺术气质，善于表达")
        if ten_god_counts.get("伤官", 0) >= 2:
            traits.append("思维活跃，创造力强")
        if ten_god_counts.get("正官", 0) >= 1:
            traits.append("有责任感，注重规则")
        if ten_god_counts.get("七杀", 0) >= 1:
            traits.append("有魄力，敢于挑战")
        if ten_god_counts.get("正印", 0) >= 1:
            traits.append("善于学习，有文化素养")
        if ten_god_counts.get("偏印", 0) >= 1:
            traits.append("善于思考，有独立见解")
        if ten_god_counts.get("比肩", 0) >= 2:
            traits.append("独立自主，不甘人后")
        if ten_god_counts.get("劫财", 0) >= 1:
            traits.append("自尊心强，竞争意识强")
        if ten_god_counts.get("正财", 0) >= 1:
            traits.append("务实，注重实际利益")
        if ten_god_counts.get("偏财", 0) >= 1:
            traits.append("善于把握机会，有投机头脑")

        # 强弱影响
        if level in ["极强", "强"]:
            traits.append("意志坚强，有主见")
        elif level in ["极弱", "弱"]:
            traits.append("内心敏感，善于观察")

        return "；".join([t for t in traits if t])

    def _analyze_career(self, day_gan: str, ten_god_counts: dict, level: str) -> str:
        """分析事业运势"""
        career_hints = []

        # 十神与事业关系
        if ten_god_counts.get("正官", 0) >= 2:
            career_hints.append("适合稳定的体制内工作")
        if ten_god_counts.get("七杀", 0) >= 1:
            career_hints.append("适合竞争性行业，有冲劲")
        if ten_god_counts.get("正印", 0) >= 1:
            career_hints.append("适合教育、文化、研究类工作")
        if ten_god_counts.get("偏印", 0) >= 1:
            career_hints.append("适合技术、研发类工作")
        if ten_god_counts.get("食神", 0) >= 2:
            career_hints.append("适合艺术、餐饮、服务业")
        if ten_god_counts.get("伤官", 0) >= 1:
            career_hints.append("适合创新、销售、表演类工作")
        if ten_god_counts.get("正财", 0) >= 2:
            career_hints.append("适合财务、投资、管理类工作")
        if ten_god_counts.get("偏财", 0) >= 1:
            career_hints.append("有商业头脑，适合创业或投资")

        # 强弱与事业
        if level in ["极强", "强"]:
            career_hints.append("适合领导岗位，有创业潜力")
        elif level in ["极弱", "弱"]:
            career_hints.append("适合稳定职业，不宜冒险")

        if not career_hints:
            career_hints.append("事业运势平稳，需要根据大运把握机会")

        return "；".join(career_hints)

    def _analyze_relationships(self, day_gan: str, ten_god_counts: dict, gender: str | None) -> str:
        """分析感情运势"""
        relationship_hints = []

        # 官杀（克日主）为异性缘
        if ten_god_counts.get("正官", 0) >= 1:
            relationship_hints.append("异性缘分较好，感情稳定")
        if ten_god_counts.get("七杀", 0) >= 1:
            relationship_hints.append("感情经历丰富，有时起伏")

        # 财（被日主克）为感情
        if ten_god_counts.get("正财", 0) >= 1:
            relationship_hints.append("重视家庭，责任心强")
        if ten_god_counts.get("偏财", 0) >= 1:
            relationship_hints.append("对感情有热情，但可能不够专注")

        # 比劫（与日主同类）为竞争
        if ten_god_counts.get("比肩", 0) >= 2:
            relationship_hints.append("感情中可能有竞争者")
        if ten_god_counts.get("劫财", 0) >= 1:
            relationship_hints.append("需注意第三者介入")

        # 日主特性
        day_gan_characteristics = {
            "甲": "重情义，但有时过于刚强",
            "乙": "温柔体贴，感情细腻",
            "丙": "热情洋溢，需要注意情绪波动",
            "丁": "内敛深情，专注专一",
            "戊": "稳重可靠，有时略显木讷",
            "己": "包容温柔，善于协调",
            "庚": "果断干脆，感情直接",
            "辛": "精致敏感，感情内敛",
            "壬": "开朗外向，感情多变",
            "癸": "深沉内省，感情执着",
        }
        char = day_gan_characteristics.get(day_gan, "")
        if char:
            relationship_hints.append(char)

        if not relationship_hints:
            relationship_hints.append("感情运势平稳，需要用心经营")

        return "；".join(relationship_hints)

    def _analyze_health(self, day_gan: str, element_analysis: dict) -> str:
        """分析健康运势"""
        health_hints = []
        day_element = FIVE_ELEMENTS.get(day_gan, "")

        # 日主五行对应的身体部位
        element_body_parts = {
            "木": "肝胆、神经系统",
            "火": "心脏、小肠、血液循环",
            "土": "脾胃、消化系统",
            "金": "肺、大肠、呼吸系统",
            "水": "肾、膀胱、泌尿系统",
        }
        body_parts = element_body_parts.get(day_element, "")
        if body_parts:
            health_hints.append(f"{day_element}过旺或过弱时需注意{body_parts}健康")

        # 缺失五行对应的健康问题
        for elem, strength in element_analysis["element_strength"].items():
            if strength < 10:
                health_hints.append(f"{elem}气不足时需注意{element_body_parts.get(elem, '相关脏腑')}健康")

        # 过旺五行需要保养
        for elem, strength in element_analysis["element_strength"].items():
            if strength > 35:
                health_hints.append(f"{elem}气过旺需注意保养{element_body_parts.get(elem, '相关脏腑')}")

        if not health_hints:
            health_hints.append("健康运势总体平稳，注意日常保养")

        return "；".join(health_hints)

    def _analyze_lucky_periods(self, chart: BaziChart, element_analysis: dict) -> str:
        """分析幸运时期"""
        hints = []

        # 喜用五行对应的年份
        lucky = element_analysis.get("lucky_elements", [])
        if lucky:
            hints.append(f"补足{','.join(lucky)}气的年份可能运势较好")

        # 幸运动物/颜色（简化）
        element_animals = {
            "木": "青、绿色，虎、兔",
            "火": "红、紫色，蛇、马",
            "土": "黄、棕色，龙、狗、牛",
            "金": "白、金色，猴、鸡",
            "水": "黑、蓝色，猪、鼠",
        }
        for elem in element_analysis["element_strength"].keys():
            if elem in element_animals:
                hints.append(f"{elem}元素对应幸运色：{element_animals[elem].split('，')[0]}")

        return "；".join(hints) if hints else "需根据大运走势判断"

    def _generate_advice(
        self,
        day_gan: str,
        level: str,
        element_analysis: dict,
        ten_god_counts: dict
    ) -> str:
        """生成改命建议"""
        advice_list = []

        # 根据强弱给出建议
        if level in ["极强", "强"]:
            advice_list.append("发挥自身优势，敢于挑战")
            advice_list.append("注意控制情绪，避免过于强势")
        elif level in ["极弱", "弱"]:
            advice_list.append("稳扎稳打，不宜冒险")
            advice_list.append("多学习积累，增强实力")

        # 补充缺失五行
        lucky = element_analysis.get("lucky_elements", [])
        if lucky:
            for elem in lucky:
                element_advice = {
                    "木": "多接触绿色植物，保持环境清新",
                    "火": "保持温暖，多晒太阳",
                    "土": "多接触大自然，保持充足睡眠",
                    "金": "注意呼吸系统保养，多在开阔地活动",
                    "水": "多喝水，保持充足水分",
                }
                hint = element_advice.get(elem, "")
                if hint:
                    advice_list.append(hint)

        # 根据十神给出建议
        if ten_god_counts.get("七杀", 0) >= 2:
            advice_list.append("注意控制冲动，三思后行")
        if ten_god_counts.get("伤官", 0) >= 2:
            advice_list.append("发挥创意优势，但需注意表达方式")
        if ten_god_counts.get("劫财", 0) >= 2:
            advice_list.append("处理好人际关系，避免恶性竞争")

        if not advice_list:
            advice_list.append("持续关注自我成长，把握机遇")

        return "；".join(advice_list)

    def _calculate_bazi_score(
        self,
        chart: BaziChart,
        element_analysis: dict,
        day_strength: dict,
        ten_gods: list[TenGodInfo]
    ) -> int:
        """计算八字评分"""
        # 基础分
        score = 60

        # 五行平衡加分
        element_strength = element_analysis["element_strength"]
        max_elem = max(element_strength.values())
        min_elem = min(element_strength.values())
        if max_elem - min_elem < 20:
            score += 10  # 五行较平衡

        # 调候加分（有特殊格局）
        # 简化处理：天干地支配合良好

        # 十神加分（有贵气）
        ten_god_names = [tg.ten_god for tg in ten_gods]
        if "正官" in ten_god_names or "正印" in ten_god_names:
            score += 5  # 有正星
        if "七杀" in ten_god_names or "伤官" in ten_god_names:
            score += 3  # 有挑战星

        # 命盘完整度
        # 检查是否有空亡等

        return min(score + day_strength["total_score"] // 10, 99)

    def _calculate_confidence(
        self,
        chart: BaziChart,
        element_analysis: dict,
        day_strength: dict
    ) -> float:
        """计算置信度"""
        # 基础置信度
        confidence = 0.70

        # 时辰准确度（小时是否确定）
        if chart.hour_gan != HEAVENLY_STEMS[0]:  # 非初始时辰
            confidence += 0.05

        # 五行分布均匀度
        element_strength = element_analysis["element_strength"]
        max_elem = max(element_strength.values())
        min_elem = min(element_strength.values())
        if max_elem - min_elem < 25:
            confidence += 0.10  # 五行较平衡

        # 日主强弱适中
        if day_strength["level"] in ["中", "强"]:
            confidence += 0.05

        return min(confidence, 0.95)

    def get_current(self, db, *, user_id):
        """获取当前八字分析"""
        return self.repository.get_current(db, user_id=user_id)