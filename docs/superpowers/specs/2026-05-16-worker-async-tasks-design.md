# Worker 异步任务设计

## 1. 概述

将 `ProfileWorkflowService.recompute()` 从同步调用转为 Celery 异步任务，并扩展 Worker 服务支持更多后台任务。

## 2. 任务列表

| Task Name | Queue | Description |
|-----------|-------|-------------|
| `ntgm.health.ping` | default | 健康检查（已存在） |
| `ntgm.profile.recompute` | default | 画像重算异步任务 |
| `ntgm.bazi.analyze` | default | 八字分析异步任务 |
| `ntgm.face.analyze` | default | 人脸分析异步任务 |

## 3. 异步任务设计

### 3.1 Profile Recompute (`ntgm.profile.recompute`)

**输入 payload:**
```python
{
    "user_id": "uuid-string",
    "reason": str,
}
```

**处理流程:**
1. 根据 `user_id` 获取用户
2. 获取当前 profile（用于变更记录）
3. 调用 `ProfileService.generate_profile()`
4. 调用 `ProfileChangeService.record_change()`
5. 调用 `MatchService.calculate_current_match()` + `persist_match()`
6. 调用 `AdviceService.generate_and_store()`
7. 更新 Job 状态为 `completed`

**输出:**
```python
{
    "profile_version": int,
    "source_snapshot": dict,
}
```

### 3.2 Bazi Analyze (`ntgm.bazi.analyze`)

**输入 payload:**
```python
{
    "user_id": "uuid-string",
}
```

**处理流程:**
1. 根据 `user_id` 获取用户
2. 调用 `BaziService.generate_from_user()`
3. 更新 Job 状态为 `completed`

### 3.3 Face Analyze (`ntgm.face.analyze`)

**输入 payload:**
```python
{
    "user_id": "uuid-string",
    "image_asset_id": "uuid-string",
}
```

**处理流程:**
1. 根据 `user_id` 获取用户
2. 获取图片资源
3. 模拟人脸特征提取（Placeholder，后续接入 MediaPipe/OpenCV）
4. 生成特征数据
5. 更新 Job 状态为 `completed`

## 4. API 变更

### POST /profiles/recompute（变更）

**Before:** 同步执行，阻塞直到完成
**After:** 创建 Job 后立即返回，异步执行

```python
@router.post("/recompute", response_model=JobCreateResponse)
def recompute_profile(...):
    # 1. 创建 Job (status=queued)
    # 2. dispatch Celery task
    # 3. 立即返回 JobCreateResponse
    pass
```

### POST /bazi/analyze（新增）

创建 Job 并 dispatch `ntgm.bazi.analyze` 任务

### POST /face/analyze（新增）

创建 Job 并 dispatch `ntgm.face.analyze` 任务

## 5. 文件变更

### 新增/修改文件

1. `services/worker/app/tasks/profile_tasks.py` - 画像相关异步任务
2. `services/worker/app/tasks/bazi_tasks.py` - 八字分析异步任务
3. `services/worker/app/tasks/face_tasks.py` - 人脸分析异步任务
4. `services/api/app/api/routes/profiles.py` - 修改 `/recompute` 为异步
5. `services/api/app/api/routes/bazi.py` - 添加 `/analyze` 端点

### 删除

1. `services/worker/app/tasks/health.py` 中的 `recompute_profile` placeholder

## 6. 错误处理

- Task 失败时更新 Job status 为 `failed`，记录 error_message
- 使用 Celery retry 机制处理临时性失败
- 最大重试次数: 3

## 7. 下一步

- 实现 `profile_tasks.py`
- 实现 `bazi_tasks.py`
- 实现 `face_tasks.py`
- 修改 API routes