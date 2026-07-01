import useCanvasStore from "@/store/canvasStore";
import { getParamChineseName } from "@/utils/paramsMap.js";
import { Button, Dropdown, Popover, Radio, Space, Switch } from "antd";
import "./BottomParamToolbar.css";

const BottomParamToolbar = ({
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
  // 直接从仓库拿全部模型、当前选中模型、切换模型方法
  const modelList = useCanvasStore((state) => state.modelList);
  const currentSelectModel = useCanvasStore(
    (state) => state.currentSelectModel,
  );
  const setCurrentSelectModel = useCanvasStore(
    (state) => state.setCurrentSelectModel,
  );

  // 节点编辑相关
  const activeNodeId = useCanvasStore((state) => state.activeNodeId);
  const nodeEditors = useCanvasStore((state) => state.nodeEditors);
  const updateNodeEditorData = useCanvasStore(
    (state) => state.updateNodeEditorData,
  );

  const editor = activeNodeId ? nodeEditors[activeNodeId] : null;
  const paramValues = editor?.data || {};

  //  参数列表
  const propList = currentSelectModel?.prop_list || [];

  // 参数修改回调
  const handleParamChange = (propKey, value) => {
    if (!editor || !activeNodeId) return;
    const newEditorData = {
      ...editor.data,
      [propKey]: value,
    };
    updateNodeEditorData(activeNodeId, newEditorData);
  };

  // 渲染单条参数
  const renderSingleParam = (prop) => {
    const {
      prop_id,
      prop_str,
      prop_name,
      prop_viewtype,
      prop_values_list = [],
    } = prop;
    const title = getParamChineseName(prop_str, prop_name);
    const currentVal = paramValues[prop_str];

    if ([1, 2, 3].includes(prop_viewtype)) {
      const options = prop_values_list.map((item) => ({
        label: item.prop_value_name,
        value: item.prop_value_id,
      }));
      return (
        <div className="paramBlock" key={prop_id}>
          <div className="blockTitle">{title}</div>
          <Radio.Group
            value={currentVal}
            onChange={(e) => handleParamChange(prop_str, e.target.value)}
            buttonStyle="solid"
          >
            <Space wrap size={8}>
              {options.map((opt) => (
                <Radio.Button key={opt.value} value={opt.value}>
                  {opt.label}
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
        </div>
      );
    }

    if (prop_viewtype === 4) {
      return (
        <div className="paramBlock" key={prop_id}>
          <div className="blockTitle">{title}</div>
          <Space>
            <Switch
              checked={Boolean(currentVal)}
              onChange={(checked) => handleParamChange(prop_str, checked)}
            />
            <span>{currentVal ? "开启" : "关闭"}</span>
          </Space>
        </div>
      );
    }

    return null;
  };

  // 参数弹窗面板
  const renderParamPanel = () => {
    return (
      <div className="panelWrap">
        {propList.map((prop) => renderSingleParam(prop))}
      </div>
    );
  };

  // 下拉菜单：点击直接调用仓库setCurrentSelectModel
  const modelMenuItems = (modelList || []).map((item) => ({
    label: item.model_title,
    key: item.id,
    onClick: () => {
      setCurrentSelectModel(item);
    },
  }));

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
        <Dropdown
          menu={{ items: modelMenuItems }}
          trigger={["click"]}
          getPopupContainer={() => document.body}
        >
          <Button onClick={(e) => e.stopPropagation()}>
            {/* 读取仓库全局选中模型展示文字 */}
            {currentSelectModel?.model_title || "请选择模型"}
          </Button>
        </Dropdown>

        {propList.length > 0 && (
          <Popover
            trigger="click"
            placement="bottom"
            content={renderParamPanel()}
          >
            <Button>参数设置</Button>
          </Popover>
        )}
      </Space>

      <Button type="primary" shape="circle" onClick={onSubmit}>
        ↑
      </Button>
    </div>
  );
};

export default BottomParamToolbar;
