import { Button, Dropdown, Space } from "antd";
import { PRESET_SIZES } from "./index";

const BottomParamToolbar = ({
  model,
  onChangeModel,
  sizeConfig,
  onChangeSize,
  preset,
  onChangePreset,
  cameraMode,
  onChangeCamera,
  imageCount,
  onChangeImageCount,
  steps,
  onChangeSteps,
  onSubmit,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        paddingTop: 12,
        borderTop: "1px solid #303030",
      }}
    >
      <Space size={16}>
        {/* 模型下拉 */}
        <Dropdown menu={{ items: [{ label: "Lib Image", key: "lib" }] }}>
          <Button>{model}</Button>
        </Dropdown>

        {/* 尺寸画质 */}
        <Dropdown
          menu={{
            items: PRESET_SIZES.map((item) => ({
              label: `${item.label} · 标准画质 · 2K`,
              key: item.value,
            })),
          }}
        >
          <Button>{sizeConfig}</Button>
        </Dropdown>
      </Space>

      {/* 发送按钮 */}
      <Button type="primary" shape="circle" onClick={onSubmit}>
        ↑
      </Button>
    </div>
  );
};

export default BottomParamToolbar;
