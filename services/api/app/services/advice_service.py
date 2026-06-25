"""
建议生成服务 - 基于画像维度动态生成个性化建议

包含:
- 当日建议生成
- 7日计划生成
- 吉日提醒
- 执行追踪建议
"""

from datetime import datetime, timedelta
from typing import Any

from app.repositories.advice_repository import AdviceRepository


class AdviceService:
    """建议生成服务"""

    # 建议模板库（按画像维度分类）
    ADVICE_TEMPLATES = {
        "riskPreference": {
            "high": {  # 高风险偏好 (>= 0.7)
                "avoid": [
                    "避免在高波动状态下做重大即时决策",
                    "忌冲动投资，尤其是不熟悉的领域",
                    "慎防被人利用你的冒险心理",
                ],
                "action": [
                    "在做重大决定前等待24小时冷静期",
                    "适合制定详细的风险评估流程",
                    "与谨慎型的人商议后再做决定",
                ],
            },
            "medium": {  # 中等风险偏好 (0.4-0.7)
                "avoid": [
                    "避免在情绪波动时做重要决定",
                    "不宜过度保守而错失机会",
                ],
                "action": [
                    "平衡风险与收益，分散投资",
                    "建立定期复盘决策的习惯",
                ],
            },
            "low": {  # 低风险偏好 (<= 0.4)
                "avoid": [
                    "避免因过度谨慎而停滞不前",
                    "不要让完美主义阻碍行动",
                ],
                "action": [
                    "适当尝试新事物，突破舒适区",
                    "设定小步快跑的目标",
                ],
            },
        },
        "longTermOrientation": {
            "high": {  # 长线主义 (>= 0.6)
                "action": [
                    "坚持长期规划的执行",
                    "利用复利效应积累优势",
                    "关注可持续的成长而非短期回报",
                ],
            },
            "low": {  # 即时满足 (< 0.4)
                "action": [
                    "设定短期里程碑以获得即时反馈",
                    "将长期目标分解为可执行的步骤",
                    "建立奖励机制激励持续行动",
                ],
            },
        },
        "emotionStability": {
            "low": {  # 情绪不稳定 (< 0.5)
                "avoid": [
                    "避免在情绪激动时与人争执",
                    "不要在低谷时做重要人生决定",
                ],
                "action": [
                    "建立情绪记录和分析的习惯",
                    "练习冥想或深呼吸平复情绪",
                    "遇到重大事件时寻求专业咨询",
                ],
            },
            "high": {  # 情绪稳定 (>= 0.7)
                "action": [
                    "发挥情绪稳定带来的决策优势",
                    "在他人需要时提供稳定的支持",
                ],
            },
        },
        "careerDrive": {
            "high": {  # 高事业驱动 (>= 0.7)
                "action": [
                    "专注核心目标，避免精力分散",
                    "设定有挑战性但可实现的目标",
                    "定期评估事业发展路径",
                ],
            },
            "low": {  # 低事业驱动 (< 0.5)
                "action": [
                    "寻找能激发热情的事业方向",
                    "从小目标开始建立成就感",
                ],
            },
        },
        "controlDrive": {
            "high": {  # 高控制欲 (>= 0.7)
                "avoid": [
                    "避免过度控制身边的一切",
                    "学会接受不确定性",
                ],
                "action": [
                    "练习放权，培养信任",
                    "专注于你能控制的事物",
                    "接纳无法改变的事实",
                ],
            },
            "low": {  # 低控制欲 (< 0.4)
                "action": [
                    "主动争取更多责任和机会",
                    "培养独立决策的能力",
                ],
            },
        },
        "rationality": {
            "high": {  # 高理性 (>= 0.7)
                "action": [
                    "发挥理性分析的优势",
                    "在做决定前收集足够数据",
                    "与他人讨论时注重逻辑",
                ],
            },
            "low": {  # 低理性 (< 0.5)
                "avoid": [
                    "避免在情绪波动时做重要决定",
                    "不要让感性干扰重大判断",
                ],
                "action": [
                    "练习逻辑分析问题的方法",
                    "在做决定前列出利弊清单",
                ],
            },
        },
        "executionStrength": {
            "high": {  # 高执行力 (>= 0.7)
                "action": [
                    "保持高效的执行惯性",
                    "利用行动惯性攻克难题",
                    "帮助他人提升执行力",
                ],
            },
            "low": {  # 低执行力 (< 0.4)
                "avoid": [
                    "避免完美主义导致的拖延",
                    "不要给自己太大压力而产生抗拒",
                ],
                "action": [
                    "从最小可行行动开始",
                    "使用2分钟规则：能2分钟内完成的事立即做",
                    "建立执行清单并跟踪进度",
                ],
            },
        },
        "wealthDrive": {
            "high": {  # 高财富驱动 (>= 0.7)
                "action": [
                    "专注于能创造财富的核心事业",
                    "建立多元收入来源",
                    "定期复盘财务状况与目标差距",
                ],
            },
            "low": {  # 低财富驱动 (< 0.4)
                "action": [
                    "注重事业的非物质回报",
                    "建立工作与生活的平衡",
                    "追求生活质量而非财富积累",
                ],
            },
        },
        "relationshipDependency": {
            "high": {  # 高社交依赖 (>= 0.6)
                "action": [
                    "善用社交网络获取资源和支持",
                    "维护重要的人脉关系",
                ],
            },
            "low": {  # 低社交依赖 (< 0.4)
                "action": [
                    "培养独立解决问题的能力",
                    "在独处中寻找成长的机会",
                ],
            },
        },
    }

    # 五行对应的风水建议
    ELEMENT_FENG_SHUI = {
        "木": {
            "lucky_direction": "东方",
            "lucky_color": "青、绿色",
            "lucky_number": "3、8",
            "lucky_animal": "虎、兔",
            "suggestions": [
                "在家中东方位置摆放绿色植物",
                "多穿绿色系衣服",
                "在东向窗户放置木质饰品",
            ],
        },
        "火": {
            "lucky_direction": "南方",
            "lucky_color": "红、紫色",
            "lucky_number": "2、7",
            "lucky_animal": "蛇、马",
            "suggestions": [
                "保持居住环境温暖明亮",
                "多晒太阳，尤其是早晨",
                "在南方位置放置暖色灯具",
            ],
        },
        "土": {
            "lucky_direction": "中央",
            "lucky_color": "黄、棕色",
            "lucky_number": "5、10",
            "lucky_animal": "龙、狗、牛",
            "suggestions": [
                "保持卧室整洁，避免杂物堆积",
                "使用陶瓷器皿",
                "在中央位置放置石头摆件",
            ],
        },
        "金": {
            "lucky_direction": "西方",
            "lucky_color": "白、金色",
            "lucky_number": "4、9",
            "lucky_animal": "猴、鸡",
            "suggestions": [
                "在西方位置放置金属装饰品",
                "多使用白色床单和衣物",
                "在书房放置金属文具架",
            ],
        },
        "水": {
            "lucky_direction": "北方",
            "lucky_color": "黑、蓝色",
            "lucky_number": "1、6",
            "lucky_animal": "猪、鼠",
            "suggestions": [
                "保持充足的水分摄入",
                "在北方位置放置鱼缸或流水摆件",
                "使用蓝色家纺用品",
            ],
        },
    }

    def __init__(self, repository: AdviceRepository | None = None) -> None:
        self.repository = repository or AdviceRepository()

    def generate_and_store(self, db, *, user_id, profile, match_response) -> dict:
        """
        基于画像动态生成个性化建议

        Args:
            db: 数据库会话
            user_id: 用户ID
            profile: 用户画像对象
            match_response: 历史人物匹配结果

        Returns:
            Advice: 生成的建议对象
        """
        # 提取画像维度
        personality_traits = getattr(profile, 'personality_traits', {}) or {}
        fortune_traits = getattr(profile, 'fortune_traits', {}) or {}
        ability_traits = getattr(profile, 'ability_traits', {}) or {}
        confidence_map = getattr(profile, 'confidence_map', {}) or {}

        # 获取匹配人物
        primary_figure = None
        if match_response and hasattr(match_response, 'topMatches') and match_response.topMatches:
            primary_figure = match_response.topMatches[0].figureName

        # 合并所有维度
        all_traits = {**personality_traits, **fortune_traits, **ability_traits}

        # 生成当日建议
        today_advice = self._generate_today_advice(all_traits, confidence_map, primary_figure)

        # 生成7日计划
        weekly_plan = self._generate_weekly_plan(all_traits, primary_figure)

        # 生成吉日提醒（未来30天内）
        lucky_days = self._generate_lucky_days(all_traits)

        # 生成风水建议
        feng_shui = self._generate_feng_shui_advice(all_traits)

        summary = {
            "todayAdvice": today_advice,
            "weeklyPlan": weekly_plan,
            "luckyDays": lucky_days,
            "fengShui": feng_shui,
            "matchedFigure": primary_figure,
            "focus": self._generate_focus_summary(all_traits, primary_figure),
        }

        return self.repository.replace_current(
            db,
            user_id=user_id,
            profile_version=getattr(profile, 'version_no', 1),
            summary=summary,
        )

    def _generate_today_advice(
        self,
        traits: dict[str, float],
        confidence_map: dict[str, float],
        matched_figure: str | None
    ) -> list[dict[str, Any]]:
        """生成当日建议"""
        advice_items = []

        # 分析各维度
        risk_pref = traits.get("riskPreference", 0.5)
        _long_term = traits.get("longTermOrientation", 0.5)
        emotion_stab = traits.get("emotionStability", 0.5)
        career_drive = traits.get("careerDrive", 0.5)
        control_drive = traits.get("controlDrive", 0.5)
        rationality = traits.get("rationality", 0.5)
        execution = traits.get("executionStrength", 0.5)
        wealth_drive = traits.get("wealthDrive", 0.5)
        relationship = traits.get("relationshipDependency", 0.5)

        # 根据风险偏好生成建议
        if risk_pref >= 0.7:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["riskPreference"]["high"], "avoid"))
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["riskPreference"]["high"], "action"))
        elif risk_pref <= 0.4:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["riskPreference"]["low"], "avoid"))
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["riskPreference"]["low"], "action"))
        else:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["riskPreference"]["medium"], "avoid"))
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["riskPreference"]["medium"], "action"))

        # 根据情绪稳定性生成建议
        if emotion_stab < 0.5:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["emotionStability"]["low"], "avoid"))
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["emotionStability"]["low"], "action"))
        elif emotion_stab >= 0.7:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["emotionStability"]["high"], "action"))

        # 根据控制欲生成建议
        if control_drive >= 0.7:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["controlDrive"]["high"], "avoid"))
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["controlDrive"]["high"], "action"))
        elif control_drive < 0.4:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["controlDrive"]["low"], "action"))

        # 根据事业驱动生成建议
        if career_drive >= 0.7:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["careerDrive"]["high"], "action"))
        elif career_drive < 0.5:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["careerDrive"]["low"], "action"))

        # 根据理性维度生成建议
        if rationality >= 0.7:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["rationality"]["high"], "action"))
        elif rationality < 0.5:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["rationality"]["low"], "avoid"))
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["rationality"]["low"], "action"))

        # 根据执行力生成建议
        if execution >= 0.7:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["executionStrength"]["high"], "action"))
        elif execution < 0.4:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["executionStrength"]["low"], "avoid"))
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["executionStrength"]["low"], "action"))

        # 根据财富驱动生成建议
        if wealth_drive >= 0.7:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["wealthDrive"]["high"], "action"))
        elif wealth_drive < 0.4:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["wealthDrive"]["low"], "action"))

        # 根据人际关系依赖生成建议
        if relationship >= 0.6:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["relationshipDependency"]["high"], "action"))
        elif relationship < 0.4:
            advice_items.extend(self._create_advice_items(self.ADVICE_TEMPLATES["relationshipDependency"]["low"], "action"))

        # 添加匹配人物的个性化建议
        if matched_figure:
            figure_advice = self._get_figure_specific_advice(matched_figure)
            advice_items.extend(figure_advice)

        # 返回前4条建议
        return advice_items[:4]

    def _create_advice_items(self, template: dict[str, list[str]], advice_type: str) -> list[dict[str, Any]]:
        """从模板创建建议项"""
        items = []
        type_map = {"avoid": "avoid", "action": "action", "record": "record"}
        type_label = {"avoid": "忌", "action": "宜", "record": "记"}

        for content in template.get(advice_type, []):
            items.append({
                "type": type_map.get(advice_type, "action"),
                "title": content[:10],
                "content": content,
                "reason": f"基于{type_label.get(advice_type, '建议')}的个性化建议",
                "status": "pending",
            })
        return items

    def _get_figure_specific_advice(self, figure_name: str) -> list[dict[str, Any]]:
        """基于匹配人物生成特定建议"""
        figure_advice_map = {
            "曹操": [
                {"type": "action", "title": "把握机遇", "content": "今日适合主动出击，把握时机型机会", "reason": "曹操型人物擅长把握乱世机遇"},
                {"type": "avoid", "title": "防多疑", "content": "避免过度猜疑导致决策延误", "reason": "曹操多疑，需注意控制"},
            ],
            "刘邦": [
                {"type": "action", "title": "广结人脉", "content": "今日适合社交应酬，建立人脉", "reason": "刘邦型人物善于整合资源"},
                {"type": "avoid", "title": "防多谋寡断", "content": "避免反复权衡错失良机", "reason": "刘邦善于谋略但需果断执行"},
            ],
            "朱元璋": [
                {"type": "action", "title": "果断决策", "content": "今日适合处理悬而未决的事务", "reason": "朱元璋型人物决策果断"},
                {"type": "avoid", "title": "防过刚", "content": "避免过于强硬而树敌", "reason": "刚柔并济更为有利"},
            ],
            "李世民": [
                {"type": "action", "title": "兼听纳谏", "content": "今日适合多方听取意见再做决策", "reason": "李世民型人物善于纳谏"},
                {"type": "avoid", "title": "防偏信", "content": "避免先入为主，需公正客观", "reason": "兼听则明，偏信则暗"},
            ],
            "张良": [
                {"type": "action", "title": "策略规划", "content": "今日适合制定长期策略和规划", "reason": "张良型人物善于谋略布局"},
                {"type": "avoid", "title": "防过度算计", "content": "避免想太多而行动不足", "reason": "张良智慧需落地执行"},
            ],
            "韩非": [
                {"type": "action", "title": "深度思考", "content": "今日适合系统性的学习和思考", "reason": "韩非型人物善于法家思想"},
                {"type": "avoid", "title": "防孤傲", "content": "避免过于特立独行而脱离团队", "reason": "韩非需注意人际关系的平衡"},
            ],
            "诸葛亮": [
                {"type": "action", "title": "细致规划", "content": "今日适合周密计划，预判风险", "reason": "诸葛亮型人物善于未雨绸缪"},
                {"type": "avoid", "title": "防事必躬亲", "content": "避免过度亲力亲为，学会委托", "reason": "鞠躬尽瘁但需注重授权"},
            ],
            "王安石": [
                {"type": "action", "title": "推进计划", "content": "今日适合推进搁置的计划或改革", "reason": "王安石型人物善于变法改革"},
                {"type": "avoid", "title": "防激进", "content": "避免过于急进而招致阻力", "reason": "变法需循序渐进"},
            ],
            "康有为": [
                {"type": "action", "title": "思想引领", "content": "今日适合传播理念，影响他人", "reason": "康有为型人物善于思想变革"},
                {"type": "avoid", "title": "防空谈", "content": "避免只说不做，需注重落地", "reason": "理想需与实践结合"},
            ],
            "苏轼": [
                {"type": "action", "title": "创意发挥", "content": "今日适合文艺创作或艺术表达", "reason": "苏轼型人物富有创造力"},
                {"type": "avoid", "title": "防情绪化", "content": "保持豁达心态，避免过度感伤", "reason": "苏轼虽乐观但也有低谷"},
            ],
            "王阳明": [
                {"type": "action", "title": "知行合一", "content": "今日适合将想法付诸实践", "reason": "王阳明型人物重在知行合一"},
                {"type": "avoid", "title": "防空想", "content": "避免过度内省而行动不足", "reason": "心学贵在实践与体认"},
            ],
            "范蠡": [
                {"type": "action", "title": "把握商机", "content": "今日适合商业活动和财务规划", "reason": "范蠡型人物善于经营致富"},
                {"type": "avoid", "title": "防贪心", "content": "见好就收，避免过度追逐利益", "reason": "范蠡懂得急流勇退"},
            ],
            "陶渊明": [
                {"type": "action", "title": "内心平静", "content": "今日适合静心修养，远离喧嚣", "reason": "陶渊明型人物追求内心宁静"},
                {"type": "avoid", "title": "防逃避", "content": "在平静中保持积极进取之心", "reason": "淡泊名利但不失上进"},
            ],
        }
        return figure_advice_map.get(figure_name, [])

    def _generate_weekly_plan(
        self,
        traits: dict[str, float],
        matched_figure: str | None
    ) -> list[dict[str, Any]]:
        """生成7日计划"""
        plans = []

        # 基于各维度生成每日计划
        risk_pref = traits.get("riskPreference", 0.5)
        _long_term = traits.get("longTermOrientation", 0.5)
        emotion_stab = traits.get("emotionStability", 0.5)
        _career_drive = traits.get("careerDrive", 0.5)
        control_drive = traits.get("controlDrive", 0.5)

        daily_themes = [
            {"day": 1, "focus": "自我评估", "desc": "完成个人SWOT分析，明确优势与短板"},
            {"day": 2, "focus": "关系梳理", "desc": "整理重要人脉关系，建立联系清单"},
            {"day": 3, "focus": "目标拆解", "desc": "将长期目标分解为可执行的里程碑"},
            {"day": 4, "focus": "技能储备", "desc": "学习一项与目标相关的新技能"},
            {"day": 5, "focus": "执行验证", "desc": "验证本周计划执行效果并记录"},
            {"day": 6, "focus": "调整优化", "desc": "根据执行情况调整下周计划"},
            {"day": 7, "focus": "复盘总结", "desc": "回顾一周收获，制定下周重点"},
        ]

        # 根据画像特性微调计划
        if risk_pref >= 0.7:
            # 高风险偏好：加强风险控制主题
            daily_themes[2] = {"day": 3, "focus": "风险评估", "desc": "评估重大决策的风险点"}
            daily_themes[4] = {"day": 5, "focus": "决策复盘", "desc": "复盘近期重大决策的执行情况"}

        if emotion_stab < 0.5:
            # 情绪不稳定：增加情绪管理主题
            daily_themes[0] = {"day": 1, "focus": "情绪记录", "desc": "记录情绪波动，分析触发因素"}
            daily_themes.append({"day": 6, "focus": "放松活动", "desc": "安排舒缓压力活动"})

        if control_drive >= 0.7:
            # 高控制欲：增加放权主题
            daily_themes[1] = {"day": 2, "focus": "信任练习", "desc": "尝试委托他人完成一项任务"}

        for theme in daily_themes:
            plans.append({
                "day": theme["day"],
                "title": theme["focus"],
                "description": theme["desc"],
            })

        return plans

    def _generate_lucky_days(self, traits: dict[str, float]) -> list[dict[str, Any]]:
        """生成吉日提醒（未来30天）"""
        lucky_days = []

        # 基于五行生成幸运日
        # 简化：生成一些基于天干地支的幸运日
        today = datetime.now()

        # 生成未来4周的幸运日
        lucky_dates = []
        base_day = today.day % 5 + 1  # 基于日期生成确定性

        for week in range(1, 5):
            lucky_date = today + timedelta(days=(7 - today.weekday()) % 7 + (week - 1) * 7 + base_day % 3)
            if lucky_date <= today + timedelta(days=30):
                lucky_dates.append(lucky_date)

        # 活动映射
        activity_map = [
            {"activity": "签订合同", "note": "木气生发，利于合约签署"},
            {"activity": "社交应酬", "note": "贵人星旺，人脉整合好时机"},
            {"activity": "学习进修", "note": "文昌星动，知识吸收佳"},
            {"activity": "投资理财", "note": "财星高照，适合财务规划"},
            {"activity": "房屋修缮", "note": "宜动土装修，布局调整"},
            {"activity": "求婚表白", "note": "感情星旺盛，姻缘运佳"},
            {"activity": "旅行出行", "note": "驿马星动，利于远行"},
        ]

        for i, date in enumerate(lucky_dates[:3]):
            activity = activity_map[i % len(activity_map)]
            lucky_days.append({
                "date": date.strftime("%Y-%m-%d"),
                "activity": activity["activity"],
                "note": activity["note"],
            })

        return lucky_days

    def _generate_feng_shui_advice(self, traits: dict[str, float]) -> dict[str, Any]:
        """生成风水建议"""
        # 基于五行偏好选择风水方向
        # 简化：使用木作为默认（对应东方、生长）
        dominant_element = "木"

        # 检查是否有明确的五行倾向
        if traits.get("elementPreference"):
            dominant_element = traits.get("elementPreference")

        element_advice = self.ELEMENT_FENG_SHUI.get(dominant_element, self.ELEMENT_FENG_SHUI["木"])

        return {
            "luckyDirection": element_advice["lucky_direction"],
            "luckyColor": element_advice["lucky_color"],
            "luckyNumber": element_advice["lucky_number"],
            "luckyAnimal": element_advice["lucky_animal"],
            "suggestions": element_advice["suggestions"],
        }

    def _generate_focus_summary(
        self,
        traits: dict[str, float],
        matched_figure: str | None
    ) -> str:
        """生成核心关注点总结"""
        risk_pref = traits.get("riskPreference", 0.5)
        long_term = traits.get("longTermOrientation", 0.5)
        career_drive = traits.get("careerDrive", 0.5)

        focuses = []

        if risk_pref >= 0.7:
            focuses.append("风险控制")
        if long_term >= 0.6:
            focuses.append("长期规划")
        if career_drive >= 0.7:
            focuses.append("事业发展")
        if matched_figure:
            focuses.append(f"学习{matched_figure}的处世之道")

        return "、".join(focuses) if focuses else "持续自我提升"

    def get_current(self, db, *, user_id, profile_version):
        """获取当前建议"""
        return self.repository.get_current(db, user_id=user_id, profile_version=profile_version)

    def update_execution_feedback(
        self,
        db,
        *,
        user_id,
        profile_version: int,
        feedback_type: str,
        feedback_text: str | None = None,
        advice_item_id: str | None = None,
    ) -> dict:
        """更新建议执行反馈"""
        feedback = {
            "type": feedback_type,
            "text": feedback_text,
            "adviceItemId": advice_item_id,
            "timestamp": datetime.now().isoformat(),
        }
        advice = self.repository.update_feedback(
            db,
            user_id=user_id,
            profile_version=profile_version,
            feedback=feedback,
        )
        if advice is None:
            return {"success": False, "message": "Advice not found"}

        # Automatically create a follow-up reminder based on feedback type
        self._create_followup_reminder(db, user_id, advice_item_id, feedback_type)

        return {"success": True, "message": "Feedback recorded"}

    def _create_followup_reminder(
        self, db, user_id, advice_item_id: str | None, feedback_type: str
    ):
        """
        Create a follow-up reminder after user provides advice feedback.
        - completed  -> review outcome in 7 days
        - in_progress -> follow up in 3 days
        - rejected/skipped -> try alternative in 5 days
        """
        from datetime import timedelta
        from app.repositories.reminder_repository import ReminderRepository

        days_map = {
            "completed": 7,
            "in_progress": 3,
            "started": 3,
            "rejected": 5,
            "skipped": 5,
            "failed": 5,
        }
        days = days_map.get(feedback_type, 3)
        trigger_at = datetime.now() + timedelta(days=days)

        title_map = {
            "completed": "复盘建议执行效果",
            "in_progress": "建议执行进度跟进",
            "started": "建议执行进度跟进",
            "rejected": "尝试新的改命建议",
            "skipped": "尝试新的改命建议",
            "failed": "重新评估改命建议",
        }
        title = title_map.get(feedback_type, "改命建议跟进")
        body = f"您关于「{advice_item_id or '当前建议'}」的反馈已记录，请查看执行效果。"

        repo = ReminderRepository()
        repo.create(
            db,
            user_id=user_id,
            title=title,
            body=body,
            trigger_at=trigger_at,
            channel="push",
            meta={"advice_item_id": advice_item_id, "feedback_type": feedback_type},
        )
        db.commit()