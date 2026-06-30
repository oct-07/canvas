import { STYLE_OPTIONS } from "./index";
import { UploadOutlined } from "@ant-design/icons";
import { Button } from "antd";

const TopActionBar = ({
  styleValue,
  onChangeStyle,
  onOpenMark,
  onUploadRefImage,
}) => {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      {/* 风格按钮，弹窗选择风格 */}
      <Button
        icon={<span>风格</span>}
        onClick={() => {
          // 这里可弹出风格选择弹窗，父组件控制
          const nextStyle =
            STYLE_OPTIONS.find((item) => item.value !== styleValue)?.value ||
            "default";
          onChangeStyle(nextStyle);
        }}
        style={{ width: 100, height: 80 }}
      />
      {/* 标记按钮 */}
      <Button
        icon={<span>标记</span>}
        onClick={onOpenMark}
        style={{ width: 100, height: 80 }}
      />
      {/* 参考图上传按钮 */}
      <Button
        icon={<UploadOutlined />}
        onClick={onUploadRefImage}
        style={{ width: 100, height: 80 }}
      />
    </div>
  );
};

export default TopActionBar;
