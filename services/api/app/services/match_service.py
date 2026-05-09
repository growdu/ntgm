from app.repositories.match_repository import MatchRepository
from app.schemas.match import MatchCurrentResponse, MatchItem


FIGURE_PROFILES = [
    {
        "name": "曹操",
        "traits": {"riskPreference": 0.82, "careerDrive": 0.9, "controlDrive": 0.86},
        "highlights": ["高控制欲", "现实主义决策", "高事业驱动"],
        "differences": ["情绪稳定性可能高于该人物"],
    },
    {
        "name": "王安石",
        "traits": {"riskPreference": 0.58, "careerDrive": 0.8, "controlDrive": 0.72},
        "highlights": ["强改革冲动", "长期主义明显", "理性驱动强"],
        "differences": ["行动节奏可能更温和"],
    },
    {
        "name": "刘邦",
        "traits": {"riskPreference": 0.74, "careerDrive": 0.78, "controlDrive": 0.62},
        "highlights": ["机会判断强", "资源整合能力高", "阶段性冒险倾向明显"],
        "differences": ["控制欲可能低于你"],
    },
]


class MatchService:
    def __init__(self, repository: MatchRepository | None = None) -> None:
        self.repository = repository or MatchRepository()

    def calculate_current_match(self, *, profile) -> MatchCurrentResponse:
        base_traits = {
            "riskPreference": profile.personality_traits.get("riskPreference", 0.5),
            "careerDrive": profile.fortune_traits.get("careerDrive", 0.5),
            "controlDrive": profile.personality_traits.get("controlDrive", 0.5),
        }

        scored: list[tuple[float, dict]] = []
        for figure in FIGURE_PROFILES:
            distance = 0.0
            for key, value in figure["traits"].items():
                distance += abs(base_traits[key] - value)
            similarity = round(max(0.0, 1 - distance / len(figure["traits"])), 2)
            scored.append((similarity, figure))

        scored.sort(key=lambda item: item[0], reverse=True)
        top_matches = [
            MatchItem(
                rank=index + 1,
                figureName=figure["name"],
                similarityScore=similarity,
                highlights=figure["highlights"],
                differences=figure["differences"],
            )
            for index, (similarity, figure) in enumerate(scored[:3])
        ]

        return MatchCurrentResponse(
            profileVersion=profile.version_no,
            topMatches=top_matches,
            explanation={
                "baseTraits": base_traits,
                "method": "weighted-placeholder-match",
            },
        )

    def persist_match(self, db, *, user_id, profile, match_response: MatchCurrentResponse):
        items = [
            {
                "rank_no": item.rank,
                "figure_name": item.figureName,
                "similarity_score": item.similarityScore,
                "similarity_breakdown": {"highlights": item.highlights},
                "difference_breakdown": {"differences": item.differences},
                "explanation": match_response.explanation,
            }
            for item in match_response.topMatches
        ]
        return self.repository.replace_results(
            db,
            user_id=user_id,
            profile_version=profile.version_no,
            items=items,
        )

    def get_current_match(self, db, *, user_id, profile):
        rows = self.repository.get_current_results(
            db, user_id=user_id, profile_version=profile.version_no
        )
        if rows:
            return MatchCurrentResponse(
                profileVersion=profile.version_no,
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

