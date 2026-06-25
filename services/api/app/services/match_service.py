"""
历史人物匹配服务 - 基于画像维度匹配历史人物原型

包含:
- 扩展历史人物库（帝王、谋士、将领、商人文人等）
- 多维度画像匹配
- 相似/差异点解释生成
"""

from typing import Any

from app.repositories.match_repository import MatchRepository
from app.schemas.match import MatchCurrentResponse, MatchItem


# 历史人物画像库
FIGURE_PROFILES: list[dict[str, Any]] = [
    # ===== 帝王将相 =====
    {
        "name": "曹操",
        "dynasty": "东汉末",
        "role": "枭雄/政治家",
        "traits": {
            "riskPreference": 0.82, "careerDrive": 0.9, "controlDrive": 0.86,
            "rationality": 0.85, "emotionStability": 0.78, "longTermOrientation": 0.8,
        },
        "highlights": [
            "高控制欲，善于把握时局",
            "现实主义决策，不择手段求结果",
            "高事业驱动，志向远大",
            "善于识人用人，麾下人才众多",
        ],
        "differences": [
            "情绪稳定性可能高于你",
            "在人际情感方面更为克制",
        ],
        "lifePhase": "势能上升期，兵强马壮",
        "advice": "发挥领导力，但需注意团队协作与情感平衡",
    },
    {
        "name": "刘邦",
        "dynasty": "西汉",
        "role": "帝王/创业者",
        "traits": {
            "riskPreference": 0.74, "careerDrive": 0.78, "controlDrive": 0.62,
            "rationality": 0.72, "emotionStability": 0.68, "longTermOrientation": 0.75,
        },
        "highlights": [
            "机会判断力强，能屈能伸",
            "资源整合能力突出",
            "阶段性冒险倾向明显",
            "知人善任，善于听取意见",
        ],
        "differences": [
            "控制欲可能低于你",
            "在关键决策上更为果断",
        ],
        "lifePhase": "从逆境中崛起，最终统一天下",
        "advice": "发挥灵活应变优势，注意战略规划的长期性",
    },
    {
        "name": "朱元璋",
        "dynasty": "明朝",
        "role": "帝王/创业者",
        "traits": {
            "riskPreference": 0.78, "careerDrive": 0.92, "controlDrive": 0.95,
            "rationality": 0.88, "emotionStability": 0.7, "longTermOrientation": 0.85,
        },
        "highlights": [
            "极高控制欲，权力高度集中",
            "事业驱动极强，从乞丐到皇帝",
            "战略规划能力强",
            "执行力惊人，意志坚定",
        ],
        "differences": [
            "更为铁血果断",
            "在制度建设上有过人之处",
        ],
        "lifePhase": "从社会底层到九五之尊的逆袭",
        "advice": "善用制度优势，但需注意刚柔并济",
    },
    {
        "name": "李世民",
        "dynasty": "唐朝",
        "role": "帝王/政治家",
        "traits": {
            "riskPreference": 0.7, "careerDrive": 0.85, "controlDrive": 0.8,
            "rationality": 0.88, "emotionStability": 0.82, "longTermOrientation": 0.78,
        },
        "highlights": [
            "文治武功皆备，格局宏大",
            "善于纳谏，能听取不同意见",
            "理性决策，平衡各方势力",
            "领导力与执行力并重",
        ],
        "differences": [
            "更注重团队协作与制度建设",
            "在平衡各方利益上有独到之处",
        ],
        "lifePhase": "开疆拓土，贞观之治",
        "advice": "发挥格局优势，注重团队与制度建设",
    },

    # ===== 谋士智囊 =====
    {
        "name": "张良",
        "dynasty": "西汉",
        "role": "谋士/战略家",
        "traits": {
            "riskPreference": 0.55, "careerDrive": 0.65, "controlDrive": 0.55,
            "rationality": 0.95, "emotionStability": 0.85, "longTermOrientation": 0.92,
        },
        "highlights": [
            "策略规划能力极强",
            "理性冷静，善于谋略布局",
            "长期主义，目光深远",
            "懂得急流勇退，功成身退",
        ],
        "differences": [
            "行动力相对较弱",
            "更为超脱淡然",
        ],
        "lifePhase": "运筹帷幄之中，决胜千里之外",
        "advice": "发挥战略思维优势，但需注重落地执行",
    },
    {
        "name": "韩非",
        "dynasty": "战国",
        "role": "思想家/法家",
        "traits": {
            "riskPreference": 0.52, "careerDrive": 0.7, "controlDrive": 0.68,
            "rationality": 0.93, "emotionStability": 0.6, "longTermOrientation": 0.85,
        },
        "highlights": [
            "逻辑严密，制度设计能力强",
            "理性分析，洞察本质",
            "长期制度建设思维",
            "学术研究与实践结合",
        ],
        "differences": [
            "更为孤傲清高",
            "在人际交往上可能存在短板",
        ],
        "lifePhase": "以法治国思想的设计者",
        "advice": "发挥制度思维优势，但需注意人际平衡",
    },
    {
        "name": "诸葛亮",
        "dynasty": "三国",
        "role": "谋士/政治家",
        "traits": {
            "riskPreference": 0.5, "careerDrive": 0.88, "controlDrive": 0.75,
            "rationality": 0.92, "emotionStability": 0.8, "longTermOrientation": 0.95,
        },
        "highlights": [
            "战略规划能力强，未雨绑缪",
            "理性冷静，洞察全局",
            "忠诚度高，责任感强",
            "长期主义，注重可持续性",
        ],
        "differences": [
            "事必躬亲，控制欲较强",
            "在授权与放权上可能不足",
        ],
        "lifePhase": "鞠躬尽瘁，死而后已",
        "advice": "发挥谋划优势，但需注意授权与团队建设",
    },

    # ===== 改革先锋 =====
    {
        "name": "王安石",
        "dynasty": "北宋",
        "role": "改革家/政治家",
        "traits": {
            "riskPreference": 0.68, "careerDrive": 0.88, "controlDrive": 0.72,
            "rationality": 0.9, "emotionStability": 0.72, "longTermOrientation": 0.9,
        },
        "highlights": [
            "改革创新意识强",
            "长期主义，敢于推动系统性变革",
            "理性驱动，逻辑严密",
            "有坚定信念，不为外界动摇",
        ],
        "differences": [
            "行动节奏可能更温和但持久",
            "更注重制度而非人际",
        ],
        "lifePhase": "变法维新，锐意改革",
        "advice": "坚持长期主义，但需注意策略的灵活性",
    },
    {
        "name": "康有为",
        "dynasty": "清末",
        "role": "改革家/思想家",
        "traits": {
            "riskPreference": 0.72, "careerDrive": 0.8, "controlDrive": 0.6,
            "rationality": 0.82, "emotionStability": 0.65, "longTermOrientation": 0.75,
        },
        "highlights": [
            "变革意识强烈",
            "善于把握历史时机",
            "有远见卓识",
            "能言善辩，宣传能力强",
        ],
        "differences": [
            "更为理想主义",
            "在坚持与妥协之间可能摇摆",
        ],
        "lifePhase": "戊戌变法，救亡图存",
        "advice": "发挥思想引领优势，但需注意落地执行",
    },

    # ===== 文人学者 =====
    {
        "name": "苏轼",
        "dynasty": "北宋",
        "role": "文人/官员",
        "traits": {
            "riskPreference": 0.6, "careerDrive": 0.65, "controlDrive": 0.5,
            "rationality": 0.85, "emotionStability": 0.75, "longTermOrientation": 0.78,
        },
        "highlights": [
            "创造力与艺术天赋",
            "理性与感性兼具",
            "适应能力强，随遇而安",
            "多才多艺，全面发展",
        ],
        "differences": [
            "控制欲较低，顺其自然",
            "在世俗成就上可能波动较大",
        ],
        "lifePhase": "问汝平生功业，黄州惠州儋州",
        "advice": "发挥创造力优势，保持豁达心态",
    },
    {
        "name": "王阳明",
        "dynasty": "明朝",
        "role": "思想家/官员",
        "traits": {
            "riskPreference": 0.62, "careerDrive": 0.75, "controlDrive": 0.7,
            "rationality": 0.88, "emotionStability": 0.9, "longTermOrientation": 0.92,
        },
        "highlights": [
            "知行合一，理论与实践并重",
            "内心强大，情绪稳定",
            "长期主义，注重修养",
            "创新思维，不拘一格",
        ],
        "differences": [
            "更为注重内心修养",
            "在世俗成就上可能波动较大",
        ],
        "lifePhase": "龙场悟道，知行合一",
        "advice": "发挥心学优势，注重知行合一",
    },

    # ===== 商界精英 =====
    {
        "name": "范蠡",
        "dynasty": "春秋",
        "role": "商人/政治家",
        "traits": {
            "riskPreference": 0.65, "careerDrive": 0.8, "controlDrive": 0.6,
            "rationality": 0.92, "emotionStability": 0.92, "longTermOrientation": 0.88,
        },
        "highlights": [
            "商业头脑敏锐，三次散财成巨富",
            "理性冷静，能屈能伸",
            "急流勇退，深谙进退之道",
            "长期规划，注重可持续性",
        ],
        "differences": [
            "更懂得分享与共赢",
            "在利益分配上更为豁达",
        ],
        "lifePhase": "功成身退，三聚三散",
        "advice": "发挥商业智慧，注重可持续发展与共赢",
    },

    # ===== 隐士贤人 =====
    {
        "name": "陶渊明",
        "dynasty": "东晋",
        "role": "隐士/文人",
        "traits": {
            "riskPreference": 0.35, "careerDrive": 0.3, "controlDrive": 0.4,
            "rationality": 0.78, "emotionStability": 0.88, "longTermOrientation": 0.75,
        },
        "highlights": [
            "淡泊名利，追求内心平静",
            "高风亮节，不为五斗米折腰",
            "艺术修养深厚",
            "适应力强，随遇而安",
        ],
        "differences": [
            "更低风险偏好与事业驱动",
            "更注重精神层面的满足",
        ],
        "lifePhase": "采菊东篱下，悠然见南山",
        "advice": "保持内心宁静，但需平衡现实责任",
    },
]


class MatchService:
    """历史人物匹配服务"""

    def __init__(self, repository: MatchRepository | None = None) -> None:
        self.repository = repository or MatchRepository()

    def calculate_current_match(self, *, profile) -> MatchCurrentResponse:
        """
        基于用户画像计算最匹配的历史人物

        Args:
            profile: 用户画像对象

        Returns:
            MatchCurrentResponse: 匹配结果
        """
        # 提取用户画像维度
        personality_traits = getattr(profile, 'personality_traits', {}) or {}
        fortune_traits = getattr(profile, 'fortune_traits', {}) or {}
        ability_traits = getattr(profile, 'ability_traits', {}) or {}

        # 合并所有维度
        base_traits = {
            "riskPreference": personality_traits.get("riskPreference", 0.5),
            "careerDrive": fortune_traits.get("careerDrive", 0.5),
            "controlDrive": personality_traits.get("controlDrive", 0.5),
            "rationality": personality_traits.get("rationality", 0.5),
            "emotionStability": personality_traits.get("emotionStability", 0.5),
            "longTermOrientation": personality_traits.get("longTermOrientation", 0.5),
            "executionStrength": ability_traits.get("executionStrength", 0.5),
            "learningVelocity": ability_traits.get("learningVelocity", 0.5),
        }

        # 计算与每个人物的相似度
        scored: list[tuple[float, dict[str, Any]]] = []
        for figure in FIGURE_PROFILES:
            similarity, breakdown = self._calculate_similarity(base_traits, figure)
            scored.append((similarity, figure, breakdown))

        # 按相似度降序排列
        scored.sort(key=lambda item: item[0], reverse=True)

        # 生成匹配结果
        profile_version = getattr(profile, 'version_no', 1)
        top_matches = [
            MatchItem(
                rank=index + 1,
                figureName=figure["name"],
                similarityScore=round(similarity, 2),
                highlights=self._generate_highlights(figure, breakdown),
                differences=self._generate_differences(figure, breakdown, base_traits),
            )
            for index, (similarity, figure, breakdown) in enumerate(scored[:5])
        ]

        return MatchCurrentResponse(
            profileVersion=profile_version,
            topMatches=top_matches,
            explanation={
                "baseTraits": base_traits,
                "method": "multi-dimensional-euclidean-match",
                "figureCount": len(FIGURE_PROFILES),
            },
        )

    def _calculate_similarity(
        self,
        base_traits: dict[str, float],
        figure: dict[str, Any]
    ) -> tuple[float, dict[str, float]]:
        """
        计算用户画像与历史人物的相似度

        使用欧氏距离计算多维度的相似性
        """
        figure_traits = figure["traits"]

        # 权重分配（根据重要性）
        weights = {
            "riskPreference": 1.5,      # 风险偏好 - 重要
            "careerDrive": 1.5,          # 事业驱动 - 重要
            "controlDrive": 1.2,        # 控制欲 - 中等
            "rationality": 1.0,          # 理性 - 一般
            "emotionStability": 1.0,    # 情绪稳定 - 一般
            "longTermOrientation": 1.3,  # 长线主义 - 中等重要
            "executionStrength": 0.8,    # 执行力 - 次要
            "learningVelocity": 0.6,    # 学习力 - 次要
        }

        weighted_distance = 0.0
        breakdown = {}

        for key, weight in weights.items():
            base_value = base_traits.get(key, 0.5)
            figure_value = figure_traits.get(key, 0.5)

            # 计算加权平方距离
            diff = base_value - figure_value
            weighted_distance += weight * (diff ** 2)
            breakdown[key] = round(1 - abs(diff), 2)

        # 转换为相似度（0-1）
        max_distance = sum(weights.values()) ** 0.5  # 最大可能距离
        similarity = max(0.0, 1 - (weighted_distance ** 0.5) / max_distance)

        return round(similarity, 2), breakdown

    def _generate_highlights(self, figure: dict[str, Any], breakdown: dict[str, float]) -> list[str]:
        """生成相似点列表"""
        highlights = figure.get("highlights", []).copy()

        # 根据维度匹配度添加额外说明
        top_dims = sorted(breakdown.items(), key=lambda x: x[1], reverse=True)[:2]
        for dim, score in top_dims:
            if score >= 0.85:
                dim_labels = {
                    "riskPreference": "风险偏好",
                    "careerDrive": "事业驱动",
                    "controlDrive": "控制欲",
                    "rationality": "理性思维",
                    "emotionStability": "情绪稳定",
                    "longTermOrientation": "长期规划",
                }
                if dim_labels.get(dim):
                    highlights.append(f"{dim_labels[dim]}与该人物高度相似")

        return highlights[:4]  # 最多4条

    def _generate_differences(
        self,
        figure: dict[str, Any],
        breakdown: dict[str, float],
        base_traits: dict[str, float]
    ) -> list[str]:
        """生成差异点列表"""
        differences = figure.get("differences", []).copy()

        # 分析主要差异维度
        low_dims = [(k, v) for k, v in breakdown.items() if v < 0.6]
        for dim, score in low_dims[:2]:
            base_value = base_traits.get(dim, 0.5)
            figure_value = figure["traits"].get(dim, 0.5)

            dim_labels = {
                "riskPreference": "风险偏好",
                "careerDrive": "事业驱动",
                "controlDrive": "控制欲",
                "rationality": "理性思维",
                "emotionStability": "情绪稳定",
                "longTermOrientation": "长期规划",
            }

            if dim_labels.get(dim):
                if base_value > figure_value:
                    differences.append(f"{dim_labels[dim]}高于该人物（你更激进）")
                else:
                    differences.append(f"{dim_labels[dim]}低于该人物（你更保守）")

        return differences[:3]  # 最多3条

    def persist_match(self, db, *, user_id, profile, match_response: MatchCurrentResponse):
        """持久化匹配结果"""
        items = [
            {
                "rank_no": item.rank,
                "figure_name": item.figureName,
                "similarity_score": item.similarityScore,
                "similarity_breakdown": {
                    "highlights": item.highlights,
                    "differences": item.differences,
                },
                "difference_breakdown": {},
                "explanation": match_response.explanation,
            }
            for item in match_response.topMatches
        ]
        return self.repository.replace_results(
            db,
            user_id=user_id,
            profile_version=getattr(profile, 'version_no', 1),
            items=items,
        )

    def get_current_match(self, db, *, user_id, profile):
        """获取当前匹配结果（从数据库或重新计算）"""
        rows = self.repository.get_current_results(
            db, user_id=user_id, profile_version=getattr(profile, 'version_no', 1)
        )
        if rows:
            return MatchCurrentResponse(
                profileVersion=getattr(profile, 'version_no', 1),
                topMatches=[
                    MatchItem(
                        rank=row.rank_no,
                        figureName=row.figure_name,
                        similarityScore=float(row.similarity_score),
                        highlights=row.similarity_breakdown.get("highlights", []),
                        differences=row.difference_breakdown.get("differences", []),
                    )
                    for row in rows
                ],
                explanation=rows[0].explanation if rows else {},
            )
        return self.calculate_current_match(profile=profile)