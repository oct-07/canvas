import { addStyle } from "@/api";
import CommonUpload from "@/components/Common/CommonUpload";
import useStyleStore from "@/store/styleStore";
import { DownOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Dropdown, Form, Input, Modal, Spin } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./StyleSelect.module.css";

// tab数字与key映射 接口传数字1/2/3/4
const tabNumToKeyMap = {
  1: "real",
  2: "2d",
  3: "3d",
  4: "custom",
};

// 添加风格弹窗
function AddStyleModal({ open, onClose, onAddSuccess, form }) {
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

      const submitData = {
        name: values.name,
        desc: values.desc,
        image: imgUrl,
      };
      await onAddSuccess(submitData);
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
    if (open) {
      form.resetFields();
      setImgUrl("");
    }
  }, [open, form]);

  return (
    <Modal
      open={open}
      title="添加风格"
      destroyOnHidden
      width={620}
      zIndex={99999}
      onCancel={onClose}
      styles={{
        mask: { cursor: "pointer", closable: true },
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
            name="image"
            rules={[{ required: true, message: "请上传图片" }]}
          >
            <div className={styles.uploadBox}>
              {!imgUrl ? (
                <CommonUpload
                  mode="cover"
                  drag={true}
                  value={imgUrl}
                  onChange={(url) => {
                    setImgUrl(url);
                    form.setFieldsValue({ image: url });
                  }}
                >
                  <div className={styles.uploadInner}>
                    <PlusOutlined />
                    <div className={styles.uploadTip}>图片上传</div>
                  </div>
                </CommonUpload>
              ) : (
                <CommonUpload
                  mode="cover"
                  drag={true}
                  value={imgUrl}
                  onChange={(url) => {
                    setImgUrl(url);
                    form.setFieldsValue({ image: url });
                  }}
                >
                  <img
                    src={imgUrl}
                    className={styles.uploadPreviewImg}
                    alt="预览图"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </CommonUpload>
              )}
            </div>
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
  fetchStyleList,
  activeTab,
  onTabChange,
}) {
  const tabItems = [
    { key: "all", label: "全部", type: null },
    { key: "real", label: "真人", type: 1 },
    { key: "2d", label: "2D", type: 2 },
    { key: "3d", label: "3D", type: 3 },
    { key: "custom", label: "自定义风格", type: 4 },
  ];

  const handleTabChange = (tab) => {
    onTabChange(tab.key);
    fetchStyleList(tab.type);
  };

  const selectCard = (item) => {
    onChange(item.style_id, item.name);
  };

  return (
    <div className={styles.dropPanel} onClick={(e) => e.stopPropagation()}>
      {/* 分类标签栏 */}
      <div className={styles.tabWrap}>
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <div
              key={tab.key}
              onClick={() => handleTabChange(tab)}
              className={`${styles.tabItem} ${isActive ? styles.tabActive : styles.tabNormal}`}
            >
              {tab.label}
            </div>
          );
        })}
      </div>

      {/* 风格卡片区域 */}
      <div className={styles.cardScrollBox}>
        {styleLoading && (
          <div className={styles.loadingMask}>
            <Spin description="加载中" />
          </div>
        )}

        <div className={styles.cardGrid}>
          {activeTab === "custom" && (
            <div className={styles.addCard} onClick={openAddModal}>
              <div className={styles.addCardInner}>
                <PlusOutlined className={styles.addIcon} />
                <div className={styles.addText}>添加风格</div>
              </div>
            </div>
          )}

          {styleList.map((item) => {
            const isSelected = selectVal === item.style_id;
            return (
              <div
                key={item.style_id}
                className={`${styles.cardBase} ${isSelected ? styles.cardSelected : styles.cardNormal}`}
                onClick={() => selectCard(item)}
              >
                <div className={styles.cardImgWrap}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className={styles.cardImg}
                    />
                  ) : (
                    <div className={styles.emptyImgBox}>无封面</div>
                  )}
                </div>
                <div className={styles.cardNameBox}>
                  <span className={styles.cardNameText}>{item.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {!styleLoading && styleList.length === 0 && (
          <div className={styles.emptyTip}>暂无风格数据</div>
        )}
      </div>
    </div>
  );
}

// 主导出组件
export default function StyleSelect({ isGlobal = false, nodeId = null }) {
  const [addForm] = Form.useForm();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedStyleName, setSelectedStyleName] = useState("");
  const isAddingModalOpen = useRef(false);

  const styleList = useStyleStore((state) => state.styleList);
  const styleLoading = useStyleStore((state) => state.styleLoading);
  const globalStyle = useStyleStore((state) => state.globalStyle);
  const nodeStyleMap = useStyleStore((state) => state.nodeStyleMap);
  const setGlobalStyle = useStyleStore((state) => state.setGlobalStyle);
  const setNodeStyle = useStyleStore((state) => state.setNodeStyle);
  const fetchStyleList = useStyleStore((state) => state.fetchStyleList);

  const currentValue = isGlobal ? globalStyle : nodeStyleMap[nodeId];

  const getTabType = useCallback((tabKey) => {
    const map = { all: null, real: 1, "2d": 2, "3d": 3, custom: 4 };
    return map[tabKey] ?? null;
  }, []);

  const handleSelect = useCallback(
    (styleId, name) => {
      setSelectedStyleName(name || "");
      if (isGlobal) {
        setGlobalStyle(styleId);
      } else {
        setNodeStyle(nodeId, styleId);
      }
      setDropdownOpen(false);
    },
    [isGlobal, nodeId, setGlobalStyle, setNodeStyle],
  );

  const handleClear = useCallback(() => {
    setSelectedStyleName("");
    if (isGlobal) {
      setGlobalStyle(null);
    } else {
      setNodeStyle(nodeId, null);
    }
  }, [isGlobal, nodeId, setGlobalStyle, setNodeStyle]);

  const openAddModal = () => {
    isAddingModalOpen.current = true;
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    isAddingModalOpen.current = false;
  };

  const handleAddSuccess = async (newStyle) => {
    console.log("新增风格：", newStyle);
    try {
      await addStyle(newStyle);
      await fetchStyleList(4);
      setActiveTab("custom");
    } catch (err) {
      console.error("添加风格失败：", err);
    }
  };

  const handleDropdownOpenChange = (open) => {
    if (isAddingModalOpen.current) return;
    setDropdownOpen(open);

    if (open) {
      fetchStyleList(getTabType(activeTab));
    }
  };

  useEffect(() => {
    fetchStyleList(null);
  }, []);

  useEffect(() => {
    fetchStyleList(getTabType(activeTab));
  }, [activeTab, fetchStyleList, getTabType]);

  const getDisplayText = () => {
    if (!currentValue) return "请选择风格";
    return selectedStyleName || currentValue;
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
            fetchStyleList={fetchStyleList}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      >
        <div
          className={styles.triggerWrap}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={`${styles.triggerText} ${currentValue ? styles.textActive : styles.textInactive}`}
          >
            {getDisplayText()}
          </span>
          <DownOutlined className={styles.iconDown} />
        </div>
      </Dropdown>

      <AddStyleModal
        open={addModalOpen}
        onClose={closeAddModal}
        onAddSuccess={handleAddSuccess}
        form={addForm}
      />
    </>
  );
}
