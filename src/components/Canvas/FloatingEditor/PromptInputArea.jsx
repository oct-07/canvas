import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./PromptInputArea.module.css";

// 默认素材列表
const defaultAssetList = [
  {
    type: "img",
    main_id: "2",
    image:
      "https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/03120d47334c40389999202d30020750~tplv-k3u1fbpfcp-watermark.image",
    label: "711ab7ef6d854146aa9...",
  },
  {
    type: "img",
    main_id: "7",
    image:
      "https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/03120d47334c40389999202d30020750~tplv-k3u1fbpfcp-watermark.image",
    label: "图片节点7",
  },
];

const PromptInputArea = ({
  html = "",
  onChangeHtml = () => {},
  assetList = defaultAssetList,
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
  const savedRangeRef = useRef(null);
  const replaceTargetRef = useRef(null);

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
    tagEl.dataset.assetId = `${item.type}-${item.main_id}`;
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
      let targetRange = null;

      if (
        savedRangeRef.current &&
        editor.contains(savedRangeRef.current.startContainer)
      ) {
        targetRange = savedRangeRef.current;
      } else if (sel.rangeCount > 0) {
        targetRange = sel.getRangeAt(0);
      } else {
        targetRange = document.createRange();
        targetRange.selectNodeContents(editor);
        targetRange.collapse(false);
      }

      // 删除输入的@符号
      const startNode = targetRange.startContainer;
      const startOffset = targetRange.startOffset;
      if (startNode.nodeType === Node.TEXT_NODE && startOffset >= 1) {
        startNode.textContent =
          startNode.textContent.slice(0, startOffset - 1) +
          startNode.textContent.slice(startOffset);
        targetRange.setStart(startNode, startOffset - 1);
        targetRange.collapse(true);
      }

      sel.removeAllRanges();
      sel.addRange(targetRange);
      const tagDom = createAssetTag(item);
      targetRange.deleteContents();
      targetRange.insertNode(tagDom);

      // 强制光标放在原子块后方
      targetRange.setStartAfter(tagDom);
      targetRange.setEndAfter(tagDom);
      sel.removeAllRanges();
      sel.addRange(targetRange);

      // 同步父组件
      lockSyncRef.current = true;
      onChangeHtml(editor.innerHTML);
      setTimeout(() => (lockSyncRef.current = false), 0);
      setMentionVisible(false);
      savedRangeRef.current = null;
    },
    [createAssetTag, onChangeHtml],
  );

  // 替换已有原子块
  const replaceAssetTag = useCallback(
    (item) => {
      if (!replaceTargetRef.current) return;
      const editor = editorRef.current;
      const oldInnerTag = replaceTargetRef.current;
      const oldShell = oldInnerTag.parentElement;

      const newShell = createAssetTag(item);
      oldShell.parentNode.insertBefore(newShell, oldShell);
      oldShell.remove();
      replaceTargetRef.current = null;

      lockSyncRef.current = true;
      onChangeHtml(editor.innerHTML);
      setTimeout(() => (lockSyncRef.current = false), 0);
      setMentionVisible(false);
    },
    [createAssetTag, onChangeHtml],
  );

  // 弹窗素材点击统一入口
  const handleSelectAsset = (item) => {
    if (replaceTargetRef.current) replaceAssetTag(item);
    else insertAssetTag(item);
  };

  // ==================== 原生事件处理 ====================
  const handleInput = useCallback(() => {
    if (lockSyncRef.current) return;
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
      }
    },
    [saveCurrentRange, updatePopoverPosition],
  );

  // 退格删除整块原子块（修复TextNode closest报错）
  const handleKeyDown = useCallback(
    (e) => {
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
      outerShell.remove();
      lockSyncRef.current = true;
      onChangeHtml(editorRef.current.innerHTML);
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
    [onChangeHtml],
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
    if (lockSyncRef.current || !editorRef.current) return;
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
      {mentionVisible && assetList.length > 0 && (
        <div
          className={`${styles.mentionPopover} nodrag nopan`}
          style={popoverStyle}
        >
          {assetList.map((item) => (
            <div
              key={`${item.type}-${item.main_id}`}
              className={styles.mentionItem}
              onClick={() => handleSelectAsset(item)}
            >
              <div className={styles.itemLeft}>
                <img src={item.image} alt="" className={styles.itemThumb} />
                <span className={styles.itemLabel}>{item.label}</span>
              </div>
              <span className={styles.itemIdTag}>@{item.main_id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromptInputArea;
