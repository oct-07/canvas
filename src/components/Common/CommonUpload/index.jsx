import { uploadMedia } from "@/utils";
import { Progress, Upload, message } from "antd";
import { useState } from "react";

const CommonUpload = ({
  // 区分两种模式 cover / button
  mode = "button",
  // cover模式专用：外部控制图片地址
  value,
  onChange,
  extraParams = {},
  children,
  drag = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [percent, setPercent] = useState(0);

  // 统一上传逻辑
  const handleBeforeUpload = async (file) => {
    setLoading(true);
    setPercent(0);
    try {
      const resData = await uploadMedia(file, extraParams, (p) =>
        setPercent(p),
      );
      message.success("素材上传完成");
      // 上传成功回调，cover传图片url，button传完整素材对象
      if (mode === "cover") {
        onChange?.(resData.fullurl);
      } else {
        onChange?.(resData);
      }
    } catch (err) {
      message.error(err?.message || "上传失败，请重试");
    } finally {
      setLoading(false);
    }
    return false;
  };

  // ========== 模式1：封面上传（图1，带预览，点击图片重传） ==========
  if (mode === "cover") {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {value ? (
          // 已有图片：图片铺满盒子，点击任意区域重新上传
          <Upload
            beforeUpload={handleBeforeUpload}
            showUploadList={false}
            drag={drag}
            style={{ width: "100%", height: "100%", border: "none" }}
          >
            <img
              src={value}
              alt="预览图"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 12,
              }}
            />
            {loading && (
              <Progress
                percent={percent}
                size="small"
                style={{ marginTop: 8 }}
              />
            )}
          </Upload>
        ) : (
          // 空状态：虚线上传框
          <Upload
            beforeUpload={handleBeforeUpload}
            showUploadList={false}
            drag={drag}
            style={{ width: "100%", height: "100%" }}
          >
            {children}
            {loading && (
              <Progress
                percent={percent}
                size="small"
                style={{ marginTop: 8 }}
              />
            )}
          </Upload>
        )}
      </div>
    );
  }

  // ========== 模式2：纯按钮上传（图2，仅文字触发，无预览） ==========
  return (
    <Upload
      beforeUpload={handleBeforeUpload}
      showUploadList={false}
      drag={false}
    >
      {children}
      {loading && (
        <Progress percent={percent} size="small" style={{ marginTop: 8 }} />
      )}
    </Upload>
  );
};

export default CommonUpload;
