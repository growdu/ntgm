# 逆天改命算命软件 API 文档

## 1. 文档说明

本文档用于定义系统核心 API 契约，面向前端、移动端、后端和测试人员。

当前文档基于现有产品与架构设计，提供第一版接口结构，用于指导后续实现与联调。

---

## 2. API 设计原则

1. 以 REST 为主
2. 所有核心资源显式版本化
3. 长耗时计算走异步任务
4. 客户端只提交证据，不直接写画像结果
5. 所有结果都围绕当前 `profileVersion`

---

## 3. 基础约定

## 3.1 Base URL

示例：

1. `https://api.example.com/api/v1`

## 3.2 数据格式

1. 请求体：`application/json`
2. 响应体：`application/json`
3. 文件上传：预签名上传或 multipart

## 3.3 鉴权

首阶段建议：

1. `Bearer Token`
2. 用户身份绑定到请求上下文

## 3.4 通用响应结构

建议：

```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

错误响应示例：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "birthDatetime is required"
  }
}
```

---

## 4. 核心资源模型

核心资源：

1. `User`
2. `IntakeRecord`
3. `LifeEvent`
4. `ImageAsset`
5. `ProfileVersion`
6. `MatchResult`
7. `AdvicePlan`
8. `Job`

---

## 5. 用户与建档接口

## 5.1 创建或更新基础信息

`POST /users/intake/basic`

### 请求

```json
{
  "name": "张三",
  "gender": "M",
  "birthDatetime": "1993-08-10T09:30:00+08:00",
  "birthPlace": "浙江杭州"
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "accepted": true,
    "nextAction": "analyze_bazi"
  }
}
```

## 5.2 获取当前用户资料

`GET /users/me`

### 响应

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "name": "张三",
    "gender": "M",
    "birthDatetime": "1993-08-10T09:30:00+08:00",
    "birthPlace": "浙江杭州",
    "currentProfileVersion": 4
  }
}
```

---

## 6. 图片上传接口

## 6.1 获取上传凭证

`POST /assets/upload-token`

### 请求

```json
{
  "fileName": "face.jpg",
  "contentType": "image/jpeg",
  "assetType": "face"
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://...",
    "storageKey": "uploads/face/abc.jpg"
  }
}
```

## 6.2 确认图片上传完成

`POST /users/intake/images`

### 请求

```json
{
  "assetType": "face",
  "storageKey": "uploads/face/abc.jpg",
  "metadata": {
    "angle": "front",
    "light": "normal"
  }
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "assetId": "uuid",
    "jobTriggered": true,
    "jobType": "analyze_face"
  }
}
```

说明：

1. 当前阶段上传凭证接口先返回占位 `uploadUrl`
2. 后续接入真实 S3 / MinIO 预签名上传

---

## 7. 问答接口

## 7.1 获取下一组问题

`GET /questionnaire/next`

### 响应

```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "questionId": "career-risk-preference",
        "questionText": "当你面对一个高收益但高不确定性的机会时，你通常会？",
        "traitTargets": [
          "riskPreference",
          "longTermOrientation"
        ],
        "options": [
          "快速抓住",
          "观察一段时间后再决定",
          "只有非常确定才行动",
          "视情况而定"
        ]
      }
    ]
  }
}
```

## 7.2 提交问题答案

`POST /questionnaire/answers`

### 请求

```json
{
  "answers": [
    {
      "questionId": "career-risk-preference",
      "value": "high",
      "reason": "愿意承担短期波动"
    }
  ]
}
```

### 响应

```json
{
  "accepted": true,
  "recomputeTriggered": true
}
```

---

## 8. 人生事件接口

## 8.1 创建事件

`POST /events`

### 请求

```json
{
  "eventType": "career_change",
  "eventTime": "2025-04-01T00:00:00+08:00",
  "title": "离职创业",
  "description": "离开原公司开始创业"
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "eventId": "uuid",
    "recomputeTriggered": true
  }
}
```

## 8.2 获取事件列表

`GET /events`

---

## 9. 画像接口

## 9.1 获取当前画像

`GET /profiles/current`

### 响应

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "profileVersion": 4,
    "summary": {
      "score": 78,
      "keywords": [
        "长线主义",
        "强控制感",
        "高事业驱动"
      ]
    },
    "traits": {
      "personality": {
        "riskPreference": 0.78,
        "rationality": 0.84,
        "emotionStability": 0.58
      }
    },
    "confidenceMap": {
      "riskPreference": 0.88,
      "emotionStability": 0.56
    }
  }
}
```

## 9.2 获取画像版本列表

`GET /profiles/versions`

## 9.3 获取指定画像版本详情

`GET /profiles/versions/{version}`

## 9.4 手动触发画像重算

`POST /profiles/recompute`

### 请求

```json
{
  "reason": "manual_refresh"
}
```

### 响应

```json
{
  "jobId": "uuid",
  "jobType": "recompute_profile",
  "status": "completed"
}
```

说明：

1. 当前阶段该接口会创建 `job` 并同步生成最小画像结果
2. 后续阶段再切换为真实 Worker 异步链路

---

## 10. 历史人物匹配接口

## 10.1 获取当前匹配结果

`GET /matches/current`

### 响应

```json
{
  "profileVersion": 4,
  "topMatches": [
    {
      "rank": 1,
      "figureName": "曹操",
      "similarityScore": 0.82,
      "highlights": [
        "高控制欲",
        "现实主义决策",
        "高权力驱动"
      ],
      "differences": [
        "情绪稳定性高于该人物"
      ]
    }
  ],
  "explanation": {
    "baseTraits": {
      "riskPreference": 0.78,
      "careerDrive": 0.76,
      "controlDrive": 0.71
    },
    "method": "weighted-placeholder-match"
  }
}
```

说明：

1. 当前阶段匹配基于占位历史人物特征库
2. 后续将替换为更完整的人物画像库与匹配规则

## 10.2 获取指定版本匹配结果

`GET /matches?profileVersion=4`

---

## 11. 建议接口

## 11.1 获取当前建议

`GET /advice/current`

### 响应

```json
{
  "adviceId": "uuid",
  "profileVersion": 4,
  "summary": {
    "today": [
      "避免在高波动状态下做重大即时决策",
      "补充一次近期重大事件记录"
    ],
    "focus": "先稳定画像，再强化执行反馈",
    "matchedFigure": "曹操"
  }
}
```

说明：

1. 当前阶段建议内容基于占位规则生成
2. 后续阶段会接入更完整建议引擎与执行反馈链路

## 11.2 获取指定版本建议

`GET /advice?profileVersion=4`

## 11.3 回填建议执行结果

`POST /advice/execution`

### 请求

```json
{
  "actionId": "uuid",
  "feedbackType": "weekly_checkin",
  "payload": {
    "done": true,
    "effectScore": 7,
    "notes": "执行后专注度改善"
  }
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "accepted": true,
    "recomputeTriggered": true
  }
}
```

---

## 12. 成长档案接口

## 12.1 获取成长时间线

`GET /archive/timeline`

## 12.2 获取版本变化记录

`GET /archive/changes`

## 12.3 导出 PDF

`POST /archive/export/pdf`

### 响应

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "jobType": "generate_report"
  }
}
```

---

## 13. 任务状态接口

## 13.1 查询任务状态

`GET /jobs/{jobId}`

### 响应

```json
{
  "jobId": "uuid",
  "jobType": "recompute_profile",
  "status": "completed",
  "payload": {},
  "result": {},
  "errorMessage": null,
  "createdAt": "2026-05-09T00:00:00Z",
  "updatedAt": "2026-05-09T00:00:01Z"
}
```

### 状态枚举建议

1. `queued`
2. `processing`
3. `completed`
4. `failed`

---

## 14. 健康检查接口

## 14.1 API 健康检查

`GET /health`

### 响应

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

## 14.2 就绪检查

`GET /ready`

建议用于检查：

1. 数据库连接
2. Redis 连接
3. 对象存储可用性

---

## 15. 错误码建议

建议至少定义以下错误码：

1. `VALIDATION_ERROR`
2. `UNAUTHORIZED`
3. `FORBIDDEN`
4. `NOT_FOUND`
5. `IMAGE_UPLOAD_FAILED`
6. `IMAGE_QUALITY_TOO_LOW`
7. `PROFILE_NOT_READY`
8. `MATCH_NOT_READY`
9. `ADVICE_NOT_READY`
10. `JOB_FAILED`
11. `INTERNAL_ERROR`

---

## 16. API 演进建议

后续实现时建议继续补充：

1. OpenAPI 规范文件
2. 请求与响应字段完整定义
3. 鉴权流程文档
4. 文件上传完整时序
5. 分页、筛选、排序约定
6. 幂等与限流策略
