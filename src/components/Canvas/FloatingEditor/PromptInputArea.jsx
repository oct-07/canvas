import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./PromptInputArea.module.css";

/**
 * 生成唯一的素材引用ID
 * @returns {string} 唯一ID，格式：asset_timestamp_random
 */
const generateAssetId = () => {
  return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 从HTML中解析出所有素材引用的assetId列表
 * @param {string} html - 编辑器的innerHTML
 * @returns {string[]} assetId数组
 */
export const parseAssetIdsFromHtml = (html) => {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tags = doc.querySelectorAll('[data-asset-id]');
  return Array.from(tags).map((tag) => tag.dataset.assetId);
};

// 默认素材列表（仅用于静态展示，实际数据从父组件传入）
const defaultAssetList = [
  {
    id: "default_1",
    type: "img",
    image: "https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/03120d47334c40389999202d30020750~tplv-k3u1fbpfcp-watermark.image",
    label: "示例素材",
  },
];

const PromptInputArea = ({
  html = "",
  onChangeHtml = () => {},
  assetList = defaultAssetList,
  onChangeAssetList = () => {}, // 素材列表变化回调，用于通知父组件更新 refAssetList
  isFullScreen = false,
}) => {
  // DOM容器
  const editorRef = useRef(null); // 内层富文本contenteditable
  const wrapRef = useRef(null); // 整体外层定位容器
  const scrollWrapRef = useRef(null); // 外层滚动容器（真正承载max-height/overflow）

  const lockSyncRef = useRef(false); // 双向同步锁，防止循环渲染

  // @素材弹窗状态
  const [mentionVisible, setMentionVisible] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({ left: 0, top: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const savedRangeRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const mentionVisibleRef = useRef(false); // 用 ref 追踪弹窗可见性，避免闭包问题
  const isInsertingRef = useRef(false); // 防止插入过程中被重置

  // 素材列表的本地状态（用于管理完整列表）
  const [localAssetList, setLocalAssetList] = useState(assetList);

  // 追踪用户本地添加的素材 ID（防止被 store 数据覆盖）
  const addedAssetIdsRef = useRef(new Set());

  // 当 assetList（上游数据）变化时，合并本地添加的素材
  useEffect(() => {
    const currentIds = new Set(localAssetList.map((a) => a.id));
    // 添加不在当前列表中但用户已添加的素材
    const mergedList = [...assetList];
    addedAssetIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        const addedAsset = localAssetList.find((a) => a.id === id);
        if (addedAsset) {
          mergedList.push(addedAsset);
        }
      }
    });
    setLocalAssetList(mergedList);
  }, [assetList]);

  // 获取当前完整的素材列表（用于同步）
  const getCurrentAssetList = useCallback(() => {
    return localAssetList;
  }, [localAssetList]);

  // ==================== 工具：清理空白文本节点，避免隐形撑高 ====================
  const cleanEmptyTextNodes = useCallback((rootEl) => {
    if (!rootEl) return;
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    const removeList = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) removeList.push(node);
    }
    removeList.forEach((n) => n.remove());
  }, []);

  // ==================== 工具：修复光标，兼容TextNode无closest报错 ====================
  const fixSelectionRange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return false;
    const range = sel.getRangeAt(0);

    // 文本节点向上转元素，避免 .closest 报错
    let containerEl = range.startContainer;
    if (containerEl.nodeType === Node.TEXT_NODE)
      containerEl = containerEl.parentElement;
    if (!containerEl) return false;

    const outerShell = containerEl.closest('[contenteditable="false"]');
    if (!outerShell) return false;

    const shellRect = outerShell.getBoundingClientRect();
    const caretRect = range.getBoundingClientRect();
    const moveBefore = caretRect.left < shellRect.left + shellRect.width / 2;

    if (moveBefore) {
      range.setStartBefore(outerShell);
      range.setEndBefore(outerShell);
    } else {
      range.setStartAfter(outerShell);
      range.setEndAfter(outerShell);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }, []);

  // 全局监听光标实时修正
  useEffect(() => {
    const handler = () => requestAnimationFrame(fixSelectionRange);
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [fixSelectionRange]);

  // 缓存光标选区
  const saveCurrentRange = useCallback(() => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0)
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  }, []);

  // ==================== 弹窗定位：右侧溢出自动左移 ====================
  const updatePopoverPosition = useCallback(() => {
    const editor = editorRef.current;
    const wrap = wrapRef.current;
    if (!editor || !wrap) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const caretRect = range.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const popoverWidth = 260;
    let baseLeft = caretRect.left - wrapRect.left;
    const popoverRight = baseLeft + popoverWidth;
    const wrapInnerWidth = wrap.clientWidth;

    // 右侧超出容器，弹窗左移
    if (popoverRight > wrapInnerWidth) baseLeft = baseLeft - popoverWidth;
    if (baseLeft < 8) baseLeft = 8;

    setPopoverStyle({
      left: baseLeft,
      top: caretRect.bottom - wrapRect.top + 8,
    });
  }, []);

  // ==================== 创建原子块DOM（外层不可编辑隔离壳，固定单行高度不撑高滚动容器） ====================
  const createAssetTag = useCallback((item) => {
    // 外层隔离壳：contenteditable=false，单行高度约束
    const outerShell = document.createElement("span");
    outerShell.contentEditable = "false";
    outerShell.style.display = "inline";
    outerShell.style.lineHeight = "1.6";
    outerShell.style.maxHeight = "26px";
    outerShell.style.overflow = "hidden";

    // 内层视觉卡片
    const tagEl = document.createElement("span");
    tagEl.className = styles.assetTag;
    // 使用传入的 assetId（用于数据恢复和引用追踪）
    tagEl.dataset.assetId = item.id || generateAssetId();
    tagEl.style.maxHeight = "26px";
    tagEl.style.overflow = "hidden";

    // 点击唤起替换弹窗
    tagEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      replaceTargetRef.current = tagEl;
      const rect = tagEl.getBoundingClientRect();
      const wrapRect = wrapRef.current.getBoundingClientRect();
      setPopoverStyle({
        left: rect.left - wrapRect.left,
        top: rect.bottom - wrapRect.top + 6,
      });
      setMentionVisible(true);
    });

    // 缩略图
    const imgWrap = document.createElement("div");
    imgWrap.className = styles.tagImgWrap;
    const img = document.createElement("img");
    img.className = styles.tagImg;
    img.src = item.image;
    img.loading = "lazy";
    img.onerror = () => (imgWrap.innerHTML = "<span>🖼</span>");
    imgWrap.appendChild(img);

    // 素材名称
    const labelText = document.createElement("span");
    labelText.className = styles.tagLabel;
    labelText.textContent = item.label;

    tagEl.append(imgWrap, labelText);
    outerShell.appendChild(tagEl);
    return outerShell;
  }, []);

  // ==================== 插入@素材 ====================
  const insertAssetTag = useCallback(
    (item) => {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (!sel.rangeCount) return;

      // 标记正在插入，防止 DOM 被重置
      isInsertingRef.current = true;

      // 获取当前选择范围
      let currentRange = sel.getRangeAt(0);
      let startNode = currentRange.startContainer;
      let insertOffset = currentRange.startOffset;

      // 向前查找并删除 @ 符号
      if (startNode.nodeType === Node.TEXT_NODE) {
        const text = startNode.textContent;
        // 找到 @ 符号位置
        let atPos = -1;
        for (let i = insertOffset - 1; i >= 0; i--) {
          if (text[i] === "@") {
            atPos = i;
            break;
          }
        }
        if (atPos >= 0) {
          // 删除 @ 符号本身
          startNode.textContent = text.slice(0, atPos) + text.slice(atPos + 1);
          insertOffset = atPos;
        }
      }

      // 确保素材有唯一ID
      const assetItem = {
        ...item,
        id: item.id || generateAssetId(),
      };

      // 创建素材标签
      const tagDom = createAssetTag(assetItem);

      // 创建新的 range 在正确的位置
      const newRange = document.createRange();
      if (startNode.nodeType === Node.TEXT_NODE) {
        newRange.setStart(startNode, insertOffset);
      } else {
        newRange.selectNodeContents(editor);
        newRange.collapse(false);
      }
      newRange.collapse(true);
      newRange.insertNode(tagDom);

      // 光标移动到标签后面
      const finalRange = document.createRange();
      finalRange.setStartAfter(tagDom);
      finalRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(finalRange);

      // 同步父组件：使用当前完整的素材列表
      lockSyncRef.current = true;
      const newHtml = editor.innerHTML;
      onChangeHtml(newHtml);

      // 获取当前完整的 assetList 并添加新插入的素材
      const currentAssetList = getCurrentAssetList();
      const updatedAssetList = [...currentAssetList];
      // 如果列表中没有这个素材，添加进去
      if (!updatedAssetList.some((a) => a.id === assetItem.id)) {
        updatedAssetList.push(assetItem);
        // 追踪用户添加的素材 ID
        addedAssetIdsRef.current.add(assetItem.id);
      }
      setLocalAssetList(updatedAssetList);
      onChangeAssetList(updatedAssetList);

      // 延迟解除锁定和插入状态
      setTimeout(() => {
        lockSyncRef.current = false;
        isInsertingRef.current = false;
      }, 50);
      setMentionVisible(false);
      savedRangeRef.current = null;
    },
    [createAssetTag, onChangeHtml, onChangeAssetList, getCurrentAssetList],
  );

  // 替换已有原子块
  const replaceAssetTag = useCallback(
    (item) => {
      if (!replaceTargetRef.current) return;
      const editor = editorRef.current;
      const oldInnerTag = replaceTargetRef.current;
      const oldShell = oldInnerTag.parentElement;

      // 获取被替换的 assetId
      const oldAssetId = oldInnerTag.dataset.assetId;

      // 确保新素材有唯一ID
      const assetItem = {
        ...item,
        id: item.id || generateAssetId(),
      };

      const newShell = createAssetTag(assetItem);
      oldShell.parentNode.insertBefore(newShell, oldShell);
      oldShell.remove();
      replaceTargetRef.current = null;

      lockSyncRef.current = true;
      const newHtml = editor.innerHTML;
      onChangeHtml(newHtml);

      // 获取当前完整的 assetList 并替换对应项
      const currentAssetList = getCurrentAssetList();
      const updatedAssetList = currentAssetList.map((a) =>
        a.id === oldAssetId ? assetItem : a
      );
      // 如果是新增的素材，更新追踪的 ID
      if (!currentAssetList.some((a) => a.id === assetItem.id)) {
        addedAssetIdsRef.current.add(assetItem.id);
      }
      setLocalAssetList(updatedAssetList);
      onChangeAssetList(updatedAssetList);

      setTimeout(() => (lockSyncRef.current = false), 0);
      setMentionVisible(false);
    },
    [createAssetTag, onChangeHtml, onChangeAssetList, getCurrentAssetList],
  );

  // 重置选中状态
  const resetSelection = () => {
    setMentionVisible(false);
    mentionVisibleRef.current = false;
    setSelectedIndex(0);
  };

  // 弹窗素材点击统一入口
  const handleSelectAsset = (item) => {
    if (replaceTargetRef.current) replaceAssetTag(item);
    else insertAssetTag(item);
    resetSelection();
  };

  // 上移选中项
  const handleMoveUp = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : localAssetList.length - 1));
  };

  // 下移选中项
  const handleMoveDown = () => {
    setSelectedIndex((prev) => (prev < localAssetList.length - 1 ? prev + 1 : 0));
  };

  // 确认选中
  const handleConfirm = () => {
    if (localAssetList.length > 0 && selectedIndex >= 0) {
      handleSelectAsset(localAssetList[selectedIndex]);
    }
  };

  // ==================== 原生事件处理 ====================
  const handleInput = useCallback(() => {
    if (lockSyncRef.current || isInsertingRef.current) return;
    const html = editorRef.current.innerHTML;
    onChangeHtml(html);
    cleanEmptyTextNodes(editorRef.current);
    if (mentionVisible) updatePopoverPosition();
  }, [
    onChangeHtml,
    mentionVisible,
    updatePopoverPosition,
    cleanEmptyTextNodes,
  ]);

  // 监听@字符唤起弹窗
  const handleKeyUp = useCallback(
    (e) => {
      // 关闭弹窗时重置选中状态
      if (e.key === "Escape" && mentionVisibleRef.current) {
        resetSelection();
        return;
      }

      // 弹窗已打开时不重复触发 @ 检测，避免重置 selectedIndex
      if (mentionVisibleRef.current) return;

      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const textNode = range.startContainer;
      const offset = range.startOffset;
      if (textNode.nodeType !== Node.TEXT_NODE || offset < 1) return;
      if (textNode.textContent[offset - 1] === "@") {
        saveCurrentRange();
        updatePopoverPosition();
        setMentionVisible(true);
        mentionVisibleRef.current = true;
        setSelectedIndex(0);
      }
    },
    [saveCurrentRange, updatePopoverPosition, resetSelection],
  );

  // 退格删除整块原子块（修复TextNode closest报错）
  const handleKeyDown = useCallback(
    (e) => {
      // 弹窗打开时的键盘导航（使用 ref 避免闭包问题）
      if (mentionVisibleRef.current) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          handleMoveUp();
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          handleMoveDown();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          handleConfirm();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          resetSelection();
          return;
        }
      }

      if (e.key !== "Backspace") return;
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);

      let curNode = range.startContainer;
      if (curNode.nodeType === Node.TEXT_NODE) curNode = curNode.parentElement;
      if (!curNode) return;
      const outerShell = curNode.closest('[contenteditable="false"]');
      if (!outerShell) return;

      e.preventDefault();
      // 获取要删除的 assetId
      const deletedAssetId = outerShell.querySelector('[data-asset-id]')?.dataset?.assetId;
      outerShell.remove();

      lockSyncRef.current = true;
      const newHtml = editorRef.current.innerHTML;
      onChangeHtml(newHtml);

      // 从 assetList 中移除被删除的素材
      if (deletedAssetId) {
        const currentAssetList = getCurrentAssetList();
        const updatedAssetList = currentAssetList.filter((a) => a.id !== deletedAssetId);
        // 从追踪列表中移除
        addedAssetIdsRef.current.delete(deletedAssetId);
        setLocalAssetList(updatedAssetList);
        onChangeAssetList(updatedAssetList);
      }

      setTimeout(() => (lockSyncRef.current = false), 0);

      // 删除后重置光标
      const newRange = document.createRange();
      const prevSib = outerShell.previousSibling;
      if (prevSib) newRange.setStartAfter(prevSib);
      else {
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(true);
      }
      sel.removeAllRanges();
      sel.addRange(newRange);
    },
    [onChangeHtml, onChangeAssetList, getCurrentAssetList, handleMoveUp, handleMoveDown, handleConfirm],
  );

  // 点击输入框刷新弹窗位置
  const handleEditorClick = useCallback(() => {
    if (mentionVisible) updatePopoverPosition();
  }, [mentionVisible, updatePopoverPosition]);

  // 全局空白处关闭弹窗
  useEffect(() => {
    const closePop = (e) => {
      const popover = document.querySelector(`.${styles.mentionPopover}`);
      if (wrapRef.current && popover && !wrapRef.current.contains(e.target)) {
        setMentionVisible(false);
      }
    };
    window.addEventListener("mousedown", closePop);
    return () => window.removeEventListener("mousedown", closePop);
  }, []);

  // 拦截粘贴，仅保留纯文本，避免带入外部 HTML 样式（div 块、border 等）
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  // 全屏切换时动态调整编辑器高度
  useEffect(() => {
    const editor = editorRef.current;
    const scrollWrap = scrollWrapRef.current;
    if (!editor || !scrollWrap) return;
    const height = isFullScreen ? "400px" : "120px";
    editor.style.minHeight = height;
    scrollWrap.style.minHeight = height;
  }, [isFullScreen]);

  // 父组件外部html同步到编辑器
  useEffect(() => {
    if (lockSyncRef.current || isInsertingRef.current || !editorRef.current) return;
    const editor = editorRef.current;
    if (editor.innerHTML !== html) {
      editor.innerHTML = html || "";
      cleanEmptyTextNodes(editor);
    }
  }, [html, cleanEmptyTextNodes]);

  return (
    <div ref={wrapRef} className={styles.editorWrap}>
      {/* 外层滚动容器：真正控制max-height、overflow，解决contenteditable滚动bug */}
      <div
        ref={scrollWrapRef}
        className={styles.scrollWrapper}
        onWheelCapture={(e) => e.stopPropagation()}
      >
        {/* 内层富文本渲染层，不携带滚动限制 */}
        <div
          ref={editorRef}
          className={`${styles.contentEditor} nodrag nopan`}
          contentEditable="true"
          data-placeholder="描述你想要生成的画面内容, @引用素材"
          suppressContentEditableWarning
          onInput={handleInput}
          onClick={handleEditorClick}
          onKeyUp={handleKeyUp}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          tabIndex={0}
        />
      </div>

      {/* @素材下拉弹窗 */}
      {mentionVisible && localAssetList.length > 0 && (
        <div
          className={`${styles.mentionPopover} nodrag nopan`}
          style={popoverStyle}
        >
          {localAssetList.map((item, idx) => (
            <div
              key={item.id || `asset-${idx}`}
              className={`${styles.mentionItem} ${idx === selectedIndex ? styles.mentionItemActive : ""}`}
              onClick={() => handleSelectAsset(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div className={styles.itemLeft}>
                <img src={item.image} alt="" className={styles.itemThumb} />
                <span className={styles.itemLabel}>{item.label}</span>
              </div>
              <span className={styles.itemIdTag}>@{item.id?.slice(-8) || idx}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromptInputArea;
