import { DownOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Dropdown, Form, Input, Modal, Upload } from "antd";
import { useRef, useState } from "react";

// 风格key-名称映射
const styleTextMap = {
  default: "默认简约",
  cartoon: "二次元卡通",
  real: "写实质感",
  shadow: "皮影戏插画风格",
};

// 模拟全部风格数据
const allStyleList = [
  {
    id: "shadow",
    name: "皮影戏插画风格",
    img: "/img/watermelon.jpg",
    tab: "all",
  },
  { id: "real", name: "写实质感", img: "/img/dog.jpg", tab: "real" },
  { id: "dark2d", name: "暗黑古风2D", img: "/img/dark.jpg", tab: "2d" },
  { id: "sponge", name: "海绵宝宝卡通", img: "/img/sponge.jpg", tab: "2d" },
  { id: "japan", name: "日系治愈插画", img: "/img/catdog.jpg", tab: "2d" },
];

// 添加风格弹窗
function AddStyleModal({ open, onClose, onAddSuccess }) {
  const [form] = Form.useForm();
  const [imgUrl, setImgUrl] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

  const beforeUpload = () => {
    setUploadLoading(true);
    setTimeout(() => {
      setImgUrl("/img/custom-demo.jpg");
      setUploadLoading(false);
    }, 800);
    return false;
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    onAddSuccess({ name: values.name, desc: values.desc, cover: imgUrl });
    form.resetFields();
    setImgUrl("");
    onClose();
  };

  return (
    <Modal
      open={open}
      title="添加风格"
      destroyOnHidden
      width={620}
      zIndex={9999}
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
          loading={uploadLoading}
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
              fileList={imgUrl ? [{ url: imgUrl, uid: "-1" }] : []}
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
function StyleDropdownPanel({ selectVal, onChange, openAddModal }) {
  const [activeTab, setActiveTab] = useState("all");

  const filterStyle = allStyleList.filter((item) => {
    if (activeTab === "all") return true;
    return item.tab === activeTab;
  });

  const selectCard = (item) => {
    onChange(item.id);
  };

  const tabItems = [
    { key: "all", label: "全部" },
    { key: "real", label: "真人" },
    { key: "2d", label: "2D" },
    { key: "3d", label: "3D" },
    { key: "custom", label: "自定义风格" },
  ];

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "nowrap",
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
              }}
            >
              {tab.label}
            </div>
          );
        })}
      </div>

      {/* 仅卡片区域滚动 */}
      <div
        style={{
          maxHeight: 350,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
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
              cover={
                <img
                  src={item.img}
                  alt={item.name}
                  style={{ height: 80, objectFit: "cover", width: "100%" }}
                />
              }
              onClick={() => selectCard(item)}
            >
              <Card.Meta title={item.name} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// 主导出组件
export default function StyleSelect({ value, onChange }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  // 核心标记：是否正在打开添加弹窗，阻断Dropdown自动关闭
  const isAddingModalOpen = useRef(false);

  const openAddModal = () => {
    isAddingModalOpen.current = true;
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setTimeout(() => {
      isAddingModalOpen.current = false;
    }, 150);
  };

  const onAddSuccess = (newStyle) => {
    console.log("新增自定义风格", newStyle);
  };

  // 拦截Dropdown关闭逻辑：弹窗打开时，禁止下拉收起
  const handleDropdownOpenChange = (open) => {
    // 如果是因为弹窗点击触发的外部点击，直接拦截，不修改下拉状态
    if (isAddingModalOpen.current) return;
    setDropdownOpen(open);
  };
  const displayText = value ? styleTextMap[value] || value : "请选择风格";

  return (
    <>
      <Dropdown
        open={dropdownOpen}
        onOpenChange={handleDropdownOpenChange}
        trigger={["click"]}
        popupRender={() => (
          <StyleDropdownPanel
            selectVal={value}
            onChange={onChange}
            openAddModal={openAddModal}
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
          }}
        >
          <span>{displayText}</span>
          <DownOutlined style={{ fontSize: 14, color: "#666" }} />
        </div>
      </Dropdown>

      <AddStyleModal
        open={addModalOpen}
        onClose={closeAddModal}
        onAddSuccess={onAddSuccess}
      />
    </>
  );
}
