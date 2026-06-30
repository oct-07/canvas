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
      <Button
        icon={<UploadOutlined />}
        onClick={onUploadRefImage}
        style={{ width: 50, height: 20 }}
      />
    </div>
  );
};

export default TopActionBar;
