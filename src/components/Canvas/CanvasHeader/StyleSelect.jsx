import useStyleStore from "@/store/styleStore";
import { DownOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Dropdown, Form, Input, Modal, Spin, Upload } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

// 添加风格弹窗
function AddStyleModal({ open, onClose, onAddSuccess }) {
  const [form] = Form.useForm();
  const [imgUrl, setImgUrl] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const beforeUpload = (file) => {
    setUploadLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgUrl(e.target.result);
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onAddSuccess({ ...values, cover: imgUrl });
      form.resetFields();
      setImgUrl("");
      setSubmitting(false);
      onClose();
    } catch (err) {
      console.error("表单校验失败：", err);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setImgUrl("");
    }
  }, [open, form]);

  return (
    <Modal
      open={open}
      title="添加风格"
      destroyOnClose
      width={620}
      zIndex={99999}
      mask={{ closable: true }}
      onCancel={onClose}
      styles={{
        mask: { cursor: "pointer" },
      }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
        >
          添加风格
        </Button>,
      ]}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Form form={form} layout="vertical">
          <Form.Item
            label="风格名称"
            name="name"
            rules={[{ required: true, message: "请输入风格名称" }]}
          >
            <Input placeholder="请输入风格名称" />
          </Form.Item>
          <Form.Item
            label="风格描述"
            name="desc"
            rules={[{ required: true, message: "请输入风格描述" }]}
          >
            <Input.TextArea rows={6} placeholder="请输入风格描述" />
          </Form.Item>
          <Form.Item
            label="风格图片"
            name="cover"
            rules={[{ required: true, message: "请上传图片" }]}
          >
            <Upload
              listType="picture-card"
              maxCount={1}
              beforeUpload={beforeUpload}
              fileList={
                imgUrl ? [{ url: imgUrl, uid: "-1", name: "cover" }] : []
              }
              onRemove={() => setImgUrl("")}
            >
              {!imgUrl && (
                <div>
                  <PlusOutlined />
                  <div>图片上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}

// 下拉面板内容
function StyleDropdownPanel({
  selectVal,
  onChange,
  openAddModal,
  styleList,
  styleLoading,
}) {
  const [activeTab, setActiveTab] = useState("all");

  // 固定分类标签
  const tabItems = [
    { key: "all", label: "全部" },
    { key: "real", label: "真人" },
    { key: "2d", label: "2D" },
    { key: "3d", label: "3D" },
    { key: "custom", label: "自定义风格" },
  ];

  // 根据 tab 过滤风格
  const filterStyle = styleList.filter((item) => {
    if (activeTab === "all") return true;
    return item.tab === activeTab;
  });

  const selectCard = (item) => {
    onChange(item.id);
  };

  return (
    <div
      style={{
        width: 500,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        border: "1px solid #666666",
        borderRadius: "10px",
        marginTop: "10px",
        backgroundColor: "#202935",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 分类标签栏 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "nowrap",
          overflowX: "auto",
        }}
      >
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "6px 16px",
                borderRadius: 9999,
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: isActive ? "#666666" : "#fff",
                color: isActive ? "#fff" : "#2c2c2c",
                border: isActive ? "1px solid #666666" : "1px solid #e5e7eb",
                flexShrink: 0,
              }}
            >
              {tab.label}
            </div>
          );
        })}
      </div>

      {/* 风格卡片区域 */}
      <div
        style={{
          maxHeight: 350,
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        {styleLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(32, 41, 53, 0.8)",
              zIndex: 1,
              borderRadius: 8,
            }}
          >
            <Spin tip="加载中..." />
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {/* 自定义风格 Tab：显示添加卡片 */}
          {activeTab === "custom" && (
            <Card
              hoverable
              variant="outlined"
              style={{
                height: 100,
                border: "1px dashed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "transparent",
              }}
              onClick={openAddModal}
            >
              <div style={{ textAlign: "center", color: "#fff" }}>
                <PlusOutlined style={{ fontSize: 16 }} />
                <div style={{ marginTop: 6 }}>添加风格</div>
              </div>
            </Card>
          )}

          {filterStyle.map((item) => (
            <Card
              key={item.id}
              hoverable
              variant={selectVal === item.id ? "bordered" : "outlined"}
              style={{
                background: selectVal === item.id ? "#2a2a3a" : undefined,
                border: selectVal === item.id ? "2px solid #177ddc" : undefined,
              }}
              cover={
                item.img || item.cover ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      height: 80,
                      objectFit: "cover",
                      width: "100%",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 80,
                      background: "#333",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#666",
                    }}
                  >
                    无封面
                  </div>
                )
              }
              onClick={() => selectCard(item)}
            >
              <Card.Meta
                title={
                  <span style={{ color: "#fff", fontSize: 13 }}>
                    {item.name}
                  </span>
                }
              />
            </Card>
          ))}

          {/* 非自定义 Tab：显示添加卡片入口 */}
          {activeTab !== "custom" && filterStyle.length > 0 && (
            <Card
              hoverable
              variant="outlined"
              style={{
                height: 100,
                border: "1px dashed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "transparent",
              }}
              onClick={openAddModal}
            >
              <div style={{ textAlign: "center", color: "#fff" }}>
                <PlusOutlined style={{ fontSize: 16 }} />
                <div style={{ marginTop: 6 }}>添加风格</div>
              </div>
            </Card>
          )}
        </div>

        {!styleLoading && filterStyle.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "#666",
            }}
          >
            暂无风格数据
          </div>
        )}
      </div>
    </div>
  );
}

// 主导出组件
export default function StyleSelect({ isGlobal = false, nodeId = null }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const isAddingModalOpen = useRef(false);

  // 从 zustand 获取状态和方法
  const styleList = useStyleStore((state) => state.styleList);
  const styleLoading = useStyleStore((state) => state.styleLoading);
  const globalStyle = useStyleStore((state) => state.globalStyle);
  const nodeStyleMap = useStyleStore((state) => state.nodeStyleMap);
  const setGlobalStyle = useStyleStore((state) => state.setGlobalStyle);
  const setNodeStyle = useStyleStore((state) => state.setNodeStyle);
  const fetchStyleList = useStyleStore((state) => state.fetchStyleList);
  const refreshStyleList = useStyleStore((state) => state.refreshStyleList);

  // 初始化加载风格列表
  useEffect(() => {
    if (styleList.length === 0) {
      fetchStyleList();
    }
  }, [fetchStyleList, styleList.length]);

  // 当前选中值：全局场景用 globalStyle，节点场景用 nodeStyleMap[nodeId]
  const currentValue = isGlobal ? globalStyle : nodeStyleMap[nodeId];

  // 选择风格回调
  const handleSelect = useCallback(
    (styleId) => {
      if (isGlobal) {
        setGlobalStyle(styleId);
      } else {
        setNodeStyle(nodeId, styleId);
      }
      setDropdownOpen(false);
    },
    [isGlobal, nodeId, setGlobalStyle, setNodeStyle],
  );

  // 清空选择
  const handleClear = useCallback(() => {
    if (isGlobal) {
      setGlobalStyle(null);
    } else {
      setNodeStyle(nodeId, null);
    }
  }, [isGlobal, nodeId, setGlobalStyle, setNodeStyle]);

  const openAddModal = () => {
    isAddingModalOpen.current = true;
    setDropdownOpen(false);
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setTimeout(() => {
      isAddingModalOpen.current = false;
    }, 150);
  };

  // 新增风格成功
  const handleAddSuccess = async (newStyle) => {
    console.log("新增风格：", newStyle);
    try {
      const { addStyle } = await import("@/api/visual");
      await addStyle(newStyle);
      await refreshStyleList();
    } catch (err) {
      console.error("添加风格失败：", err);
    }
  };

  // 拦截 Dropdown 关闭逻辑
  const handleDropdownOpenChange = (open) => {
    if (isAddingModalOpen.current) return;
    setDropdownOpen(open);
  };

  // 获取选中风格的展示名称
  const getDisplayText = () => {
    if (!currentValue) return "请选择风格";
    const found = styleList.find(
      (item) => String(item.id) === String(currentValue),
    );
    return found?.name || currentValue;
  };

  return (
    <>
      <Dropdown
        open={dropdownOpen}
        onOpenChange={handleDropdownOpenChange}
        trigger={["click"]}
        getPopupContainer={() => document.body}
        popupRender={() => (
          <StyleDropdownPanel
            selectVal={currentValue}
            onChange={handleSelect}
            openAddModal={openAddModal}
            styleList={styleList}
            styleLoading={styleLoading}
          />
        )}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            background: "#1f1f1f",
            borderRadius: 8,
            cursor: "pointer",
            border: "none",
            whiteSpace: "nowrap",
            minWidth: 100,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span style={{ flex: 1, color: currentValue ? "#fff" : "#666" }}>
            {getDisplayText()}
          </span>
          {currentValue && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                handleClear();
              }}
              style={{
                marginLeft: 4,
                color: "#888",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ×
            </span>
          )}
          <DownOutlined style={{ fontSize: 14, color: "#666" }} />
        </div>
      </Dropdown>

      <AddStyleModal
        open={addModalOpen}
        onClose={closeAddModal}
        onAddSuccess={handleAddSuccess}
      />
    </>
  );
}
