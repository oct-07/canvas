/**
 * 通用 DOM 工具函数
 */

/**
 * 判断一个 DOM 元素是否处于"可编辑/可输入"状态
 * 用于全局键盘事件判断当前按键是否应被业务层拦截
 * （例如 Backspace 在输入框中应当由输入框处理，不应触发上层删除节点）
 *
 * 覆盖范围：
 * - 原生表单元素：INPUT / TEXTAREA / SELECT
 * - 富文本元素：contenteditable
 * - Ant Design 容器类：Select / TreeSelect / Modal / Popover / Dropdown / DatePicker / Cascader / InputNumber
 * - 浮动层：Tooltip / Popconfirm（按 Esc 关闭是常见交互，避免与上层冲突）
 *
 * @param {Element|null|undefined} el - 目标元素
 * @returns {boolean} true = 可编辑，按键由元素内部消费
 */
export function isEditableElement(el) {
  if (!el || !el.tagName) return false;

  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;

  // Ant Design 常用交互容器
  if (el.closest(".ant-select, .ant-tree-select, .ant-cascader, .ant-date-picker, .ant-time-picker, .ant-input-number, .ant-modal, .ant-popover, .ant-dropdown, .ant-tooltip, .ant-popconfirm")) {
    return true;
  }

  return false;
}
