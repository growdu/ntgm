"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { AppShell } from "../components/Navigation";
import { Toast } from "../components/Toast";
import { submitBasicIntake } from "@ntgm/sdk";
import styles from "./onboarding.module.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

const steps = [
  { id: 1, label: "基础信息" },
  { id: 2, label: "上传照片" },
  { id: 3, label: "初始分析" },
  { id: 4, label: "校准问答" },
  { id: 5, label: "完成" },
];

interface FormData {
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timeUncertain: boolean;
  facePhoto: string | null;
  palmPhoto: string | null;
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    gender: "",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    timeUncertain: false,
    facePhoto: null,
    palmPhoto: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const palmInputRef = useRef<HTMLInputElement>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.name.trim()) newErrors.name = "请输入姓名";
      if (!formData.gender) newErrors.gender = "请选择性别";
      if (!formData.birthDate) newErrors.birthDate = "请选择出生日期";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleNext = async () => {
    // Step 3: show "正在生成" feedback then advance
    if (currentStep === 3) {
      setIsAnalysing(true);
      setTimeout(() => {
        setIsAnalysing(false);
        if (currentStep < 5) {
          setCurrentStep(currentStep + 1);
        }
      }, 2000);
      return;
    }

    if (!validateStep()) return;

    if (currentStep === 1) {
      setIsSubmitting(true);
      try {
        await submitBasicIntake(API_BASE_URL, {
          name: formData.name,
          gender: formData.gender === "M" ? "male" : "female",
          birthDatetime: `${formData.birthDate}T${formData.birthTime || "12:00"}:00`,
          birthPlace: formData.birthPlace,
        });
      } catch {
        showToast("保存失败，但可以继续下一步", "error");
      }
      setIsSubmitting(false);
    }

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePhotoUpload =
    (type: "face" | "palm") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setFormData((prev) => ({
            ...prev,
            [type === "face" ? "facePhoto" : "palmPhoto"]: ev.target
              ?.result as string,
          }));
        };
        reader.readAsDataURL(file);
      }
    };

  const impactedItems = [
    "八字命盘计算",
    "初版性格推断",
    "待补充问题列表",
    "命运走势初步判断",
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <div className={styles.formHeader}>
              <h1 className={styles.title}>第一步：建立你的命理底盘</h1>
              <p className={styles.subtitle}>
                这些信息用于生成第一版命盘，不会直接决定最终画像
              </p>
            </div>

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>姓名</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="请输入姓名"
                  className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                  aria-label="姓名"
                />
                {errors.name && (
                  <span className={styles.errorText}>{errors.name}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>性别</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`${styles.select} ${errors.gender ? styles.inputError : ""}`}
                  aria-label="性别"
                >
                  <option value="">请选择</option>
                  <option value="M">男</option>
                  <option value="F">女</option>
                </select>
                {errors.gender && (
                  <span className={styles.errorText}>{errors.gender}</span>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>出生日期</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.birthDate ? styles.inputError : ""}`}
                    aria-label="出生日期"
                  />
                  {errors.birthDate && (
                    <span className={styles.errorText}>{errors.birthDate}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>出生时辰</label>
                  <div className={styles.timeInput}>
                    <select
                      name="birthTime"
                      value={formData.birthTime}
                      onChange={handleInputChange}
                      className={styles.select}
                      aria-label="出生时辰"
                    >
                      <option value="">请选择</option>
                      <option value="00:00">子时 (23:00-01:00)</option>
                      <option value="01:00">丑时 (01:00-03:00)</option>
                      <option value="02:00">寅时 (03:00-05:00)</option>
                      <option value="03:00">卯时 (05:00-07:00)</option>
                      <option value="04:00">辰时 (07:00-09:00)</option>
                      <option value="05:00">巳时 (09:00-11:00)</option>
                      <option value="06:00">午时 (11:00-13:00)</option>
                      <option value="07:00">未时 (13:00-15:00)</option>
                      <option value="08:00">申时 (15:00-17:00)</option>
                      <option value="09:00">酉时 (17:00-19:00)</option>
                      <option value="10:00">戌时 (19:00-21:00)</option>
                      <option value="11:00">亥时 (21:00-23:00)</option>
                    </select>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.timeUncertain}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            timeUncertain: e.target.checked,
                          }))
                        }
                      />
                      时辰不确定
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>出生地</label>
                <input
                  type="text"
                  name="birthPlace"
                  value={formData.birthPlace}
                  onChange={handleInputChange}
                  placeholder="如：浙江省杭州市"
                  className={styles.input}
                  aria-label="出生地"
                />
              </div>
            </div>

            {formData.timeUncertain && (
              <div className={styles.notice}>
                <span className={styles.noticeIcon}>⚠</span>
                <p>系统将生成多个候选命盘，后续通过问答校准确定准确时辰。</p>
              </div>
            )}

            <div className={styles.impactSection}>
              <h3 className={styles.impactTitle}>本轮提交后将更新：</h3>
              <ul className={styles.impactList}>
                {impactedItems.map((item, index) => (
                  <li key={index} className={styles.impactItem}>
                    <span className={styles.impactDot} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <div className={styles.formHeader}>
              <h1 className={styles.title}>第二步：补充外在特征</h1>
              <p className={styles.subtitle}>
                你的照片不会单独决定结论，它们只会作为画像的辅助证据
              </p>
            </div>

            <div className={styles.photoSection}>
              <div className={styles.photoCard}>
                <h3 className={styles.photoTitle}>面部照片</h3>
                <div
                  className={styles.photoUpload}
                  onClick={() => faceInputRef.current?.click()}
                >
                  {formData.facePhoto ? (
                    <img
                      src={formData.facePhoto}
                      alt="面部"
                      className={styles.photoPreview}
                    />
                  ) : (
                    <div className={styles.photoPlaceholder}>
                      <span className={styles.photoIcon}>📷</span>
                      <span>上传正脸照</span>
                    </div>
                  )}
                </div>
                <input
                  ref={faceInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload("face")}
                  className={styles.hiddenInput}
                  aria-label="上传面部照片"
                />
                <p className={styles.photoHint}>光线均匀、无遮挡</p>
                <p className={styles.photoStatus}>
                  {formData.facePhoto ? "✓ 已上传" : "待上传"}
                </p>
              </div>

              <div className={styles.photoCard}>
                <h3 className={styles.photoTitle}>手掌照片</h3>
                <div
                  className={styles.photoUpload}
                  onClick={() => palmInputRef.current?.click()}
                >
                  {formData.palmPhoto ? (
                    <img
                      src={formData.palmPhoto}
                      alt="手掌"
                      className={styles.photoPreview}
                    />
                  ) : (
                    <div className={styles.photoPlaceholder}>
                      <span className={styles.photoIcon}>✋</span>
                      <span>上传左手掌</span>
                    </div>
                  )}
                </div>
                <input
                  ref={palmInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload("palm")}
                  className={styles.hiddenInput}
                  aria-label="上传手掌照片"
                />
                <p className={styles.photoHint}>掌心朝上、手指自然张开</p>
                <p className={styles.photoStatus}>
                  {formData.palmPhoto ? "✓ 已上传" : "待上传"}
                </p>
              </div>
            </div>

            <div className={styles.photoTips}>
              <h4 className={styles.tipsTitle}>拍摄提示</h4>
              <ul className={styles.tipsList}>
                <li>正脸直视镜头</li>
                <li>不使用夸张滤镜</li>
                <li>手掌线条需清晰</li>
              </ul>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div className={styles.formHeader}>
              <h1 className={styles.title}>第三步：初始分析</h1>
              <p className={styles.subtitle}>系统正在分析你的信息...</p>
            </div>
            <div className={styles.analyzingState}>
              <div className={styles.analyzingSpinner}>☯</div>
              <p className={styles.analyzingText}>正在生成八字命盘</p>
              <div className={styles.analyzingSteps}>
                <div className={styles.analyzingStep}>
                  <span className={styles.stepDone}>✓</span>
                  <span>基础信息分析完成</span>
                </div>
                <div className={styles.analyzingStep}>
                  <span className={styles.stepDone}>✓</span>
                  <span>八字命盘计算中...</span>
                </div>
                <div className={styles.analyzingStep}>
                  <span className={`${styles.stepPending} ${styles.active}`}>
                    ●
                  </span>
                  <span>画像初步生成</span>
                </div>
              </div>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <div className={styles.formHeader}>
              <h1 className={styles.title}>第四步：校准问答</h1>
              <p className={styles.subtitle}>
                回答几个问题，帮助系统更准确地了解你
              </p>
            </div>
            <div className={styles.questionPreview}>
              <p className={styles.questionLabel}>系统将问你 8 道问题</p>
              <p className={styles.questionDesc}>
                每道题大约需要 30 秒，预计 5 分钟完成
              </p>
              <div className={styles.questionTopics}>
                <span className={styles.topic}>风险偏好</span>
                <span className={styles.topic}>决策风格</span>
                <span className={styles.topic}>人际关系</span>
                <span className={styles.topic}>事业规划</span>
              </div>
            </div>
          </>
        );

      case 5:
        return (
          <>
            <div className={styles.formHeader}>
              <h1 className={styles.title}>建档完成</h1>
              <p className={styles.subtitle}>恭喜！你已完成初始建档</p>
            </div>
            <div className={styles.completionState}>
              <div className={styles.completionIcon}>✓</div>
              <h2 className={styles.completionTitle}>初始画像 V1 已生成</h2>
              <p className={styles.completionDesc}>
                系统已基于你的基础信息生成第一版画像。
                继续补充更多信息，系统会持续校准，让画像越来越准确。
              </p>
              <div className={styles.completionStats}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>V1</span>
                  <span className={styles.statLabel}>当前版本</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>61%</span>
                  <span className={styles.statLabel}>置信度</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>8</span>
                  <span className={styles.statLabel}>待校准项</span>
                </div>
              </div>
              <div className={styles.completionActions}>
                <Link href="/analysis" className="btn btn-primary">
                  查看初始分析
                </Link>
                <Link href="/questionnaire" className="btn btn-secondary">
                  开始问答校准
                </Link>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <AppShell>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className={styles.page}>
        <div className={styles.container}>
          {/* 进度指示器 */}
          <div className={styles.progressSection}>
            <div className={styles.stepper}>
              {steps.map((step, index) => (
                <div key={step.id} className={styles.stepItem}>
                  <div
                    className={`${styles.stepDot} ${
                      currentStep >= step.id ? styles.active : ""
                    } ${currentStep === step.id ? styles.current : ""}`}
                  >
                    {currentStep > step.id ? "✓" : step.id}
                  </div>
                  <span
                    className={`${styles.stepLabel} ${
                      currentStep >= step.id ? styles.active : ""
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <div
                      className={`${styles.stepLine} ${
                        currentStep > step.id ? styles.active : ""
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 主内容区 */}
          <div className={styles.content}>
            <div className={styles.formSection}>
              {renderStepContent()}

              {currentStep < 5 && (
                <div className={styles.actions}>
                  {currentStep > 1 && (
                    <button className="btn btn-secondary" onClick={handlePrev}>
                      上一步
                    </button>
                  )}
                  <div className={styles.actionsRight}>
                    {currentStep === 2 && (
                      <button
                        className="btn btn-secondary"
                        onClick={handleNext}
                      >
                        稍后上传
                      </button>
                    )}
                    {currentStep < 3 && (
                      <button
                        className="btn btn-primary"
                        onClick={handleNext}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "保存中..." : "下一步"}
                      </button>
                    )}
                    {currentStep === 3 && (
                      <button
                        className="btn btn-primary"
                        onClick={handleNext}
                        disabled={isAnalysing}
                      >
                        {isAnalysing ? "生成中..." : "生成画像"}
                      </button>
                    )}
                    {currentStep === 4 && (
                      <Link href="/questionnaire" className="btn btn-primary">
                        开始问答
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 右侧辅助信息 */}
            <div className={styles.sidebar}>
              <div className={styles.sidebarCard}>
                <h3 className={styles.sidebarTitle}>建档进度</h3>
                <div className={styles.progressInfo}>
                  <div className={styles.progressStat}>
                    <span className={styles.progressValue}>{currentStep}</span>
                    <span className={styles.progressLabel}>
                      / {steps.length} 步
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${(currentStep / steps.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {currentStep === 1 && (
                <>
                  <div className={styles.sidebarCard}>
                    <h3 className={styles.sidebarTitle}>预计耗时</h3>
                    <p className={styles.sidebarText}>
                      约 5 分钟完成基本信息录入
                    </p>
                  </div>

                  <div className={styles.sidebarCard}>
                    <h3 className={styles.sidebarTitle}>隐私说明</h3>
                    <p className={styles.sidebarText}>
                      你的信息仅用于命理分析，不会共享给第三方。
                    </p>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <div className={styles.sidebarCard}>
                  <h3 className={styles.sidebarTitle}>照片说明</h3>
                  <p className={styles.sidebarText}>
                    照片仅用于面相和手相分析，不会存储在服务器超过必要时间。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
