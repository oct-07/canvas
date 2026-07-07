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
 * 判断素材是否为视频
 * 优先用 type 字段（上游传过来时统一为 'video'），兜底用 URL 后缀
 */
const isVideoItem = (item) => {
  if (!item) return false;
  if (item.type === "video") return true;
  const url = item.url;
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|avi)$/i.test(url);
};

/**
 * 根据素材类型返回 @ 引用前缀
 * 视频素材显示 @视频N，图片素材显示 @图N
 */
const getAssetRefPrefix = (item) => (isVideoItem(item) ? "@视频" : "@图");

/**
 * 从HTML中解析出所有素材引用的assetId列表
 * @param {string} html - 编辑器的innerHTML
 * @returns {string[]} assetId数组
 */
export const parseAssetIdsFromHtml = (html) => {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tags = doc.querySelectorAll("[data-asset-id]");
  return Array.from(tags).map((tag) => tag.dataset.assetId);
};

// 默认素材列表（仅用于静态展示，实际数据从父组件传入）
const defaultAssetList = [];

const PromptInputArea = ({
  html = "",
  onChangeHtml = () => {},
  assetList = defaultAssetList,
  onChangeAssetList = () => {}, // 素材列表变化回调，用于通知父组件更新 refAssetList
  isFullScreen = false,
}) => {
  // DOM容器
  const editorRef = useRef(null); // 内层富文本contenteditable
  const promptEditorRef = useRef(null); // 通过稳定选择器追踪提示词编辑器DOM
  const wrapRef = useRef(null); // 整体外层定位容器
  const scrollWrapRef = useRef(null); // 外层滚动容器（真正承载max-height/overflow）

  const lockSyncRef = useRef(false); // 双向同步锁，防止循环渲染
  const lastSyncedHtmlRef = useRef(html); // 已同步的html快照，用于判断是否真正需要覆写
  const isLocalModifyRef = useRef(false); // 标记本次html变更是否来自本地操作，阻断store回写循环

  // @素材弹窗状态
  const [mentionVisible, setMentionVisible] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({ left: 0, top: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const savedRangeRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const mentionVisibleRef = useRef(false); // 用 ref 追踪弹窗可见性，避免闭包问题
  const isInsertingRef = useRef(false); // 防止插入过程中被重置
  // 按类型分组计数：视频 / 图片各自从 1 开始
  const videoSeqRef = useRef(1);
  const imageSeqRef = useRef(1);
  const assetIdToSeqRef = useRef(new Map());
  // 素材列表的本地状态（用于管理完整列表）
  const [localAssetList, setLocalAssetList] = useState(assetList);

  // 给一个新素材分配组内序号（按类型独立从 1 开始），并写入 id→seq 映射
  const allocateSeq = useCallback((item) => {
    const seqRef = isVideoItem(item) ? videoSeqRef : imageSeqRef;
    const seq = seqRef.current;
    seqRef.current += 1;
    if (item?.id) assetIdToSeqRef.current.set(item.id, seq);
    return seq;
  }, []);

  // 按当前列表重建 id→seq 映射，每个类型内部从 1 紧凑重排；
  // 同时把两个类型的计数器重置为「该类型当前总数 + 1」，便于后续新增继续递增。
  const rebuildSeqMap = useCallback((list) => {
    const newSeqMap = new Map();
    let videoCount = 0;
    let imageCount = 0;
    (list || []).forEach((asset) => {
      if (isVideoItem(asset)) {
        videoCount += 1;
        if (asset.id) newSeqMap.set(asset.id, videoCount);
      } else {
        imageCount += 1;
        if (asset.id) newSeqMap.set(asset.id, imageCount);
      }
    });
    assetIdToSeqRef.current = newSeqMap;
    videoSeqRef.current = videoCount + 1;
    imageSeqRef.current = imageCount + 1;
  }, []);

  // 追踪用户本地添加的素材 ID（防止被 store 数据覆盖）
  const addedAssetIdsRef = useRef(new Set());

  // 同步真实提示词编辑器 DOM，避免父组件拿到的 promptRef 与实际 DOM 脱节
  useEffect(() => {
    promptEditorRef.current = editorRef.current;
  });

  // 组件挂载时初始化快照兜底
  useEffect(() => {
    lastSyncedHtmlRef.current = html || "";
  }, []);

  // 当 assetList（上游数据）变化时，合并本地添加的素材，并重建序号映射
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

    // 重建序号映射：按类型分组（视频 / 图片各自从 1 紧凑重排）
    rebuildSeqMap(mergedList);

    // 兜底清理：如果 prompt DOM 里还有 assetList 中不存在的素材引用，直接删除
    const editor = promptEditorRef.current || editorRef.current;
    if (!editor) return;
    const validIds = new Set(assetList.map((a) => a.id));
    let changed = false;
    editor.querySelectorAll("[data-asset-id]").forEach((tag) => {
      if (!validIds.has(tag.dataset.assetId)) {
        const outerShell = tag.closest('[contenteditable="false"]');
        if (outerShell) {
          outerShell.remove();
          changed = true;
        }
      }
    });
    if (changed) {
      const cleanedHtml = editor.innerHTML;
      lastSyncedHtmlRef.current = cleanedHtml;
      onChangeHtml(cleanedHtml);
    }
  }, [assetList, rebuildSeqMap]);

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
  const createAssetTag = useCallback(
    (item) => {
      const outerShell = document.createElement("span");
      outerShell.contentEditable = "false";
      outerShell.style.display = "inline";
      outerShell.style.lineHeight = "1.6";
      outerShell.style.maxHeight = "26px";
      outerShell.style.overflow = "hidden";

      const tagEl = document.createElement("span");
      tagEl.className = styles.assetTag;
      const assetId = item.id || generateAssetId();
      tagEl.dataset.assetId = assetId;
      tagEl.style.maxHeight = "26px";
      tagEl.style.overflow = "hidden";

      // 点击替换弹窗逻辑不变
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
        mentionVisibleRef.current = true;
      });

      const imgWrap = document.createElement("div");
      imgWrap.className = styles.tagImgWrap;

      // 视频素材用 video 取首帧作为缩略图；图片素材继续用 img
      if (isVideoItem(item)) {
        const video = document.createElement("video");
        video.src = item.url;
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.className = styles.tagImg;
        video.addEventListener("loadedmetadata", () => {
          try {
            video.currentTime = 0.1;
          } catch (_) {
            /* 某些浏览器不允许 seek，忽略 */
          }
        });
        video.addEventListener("error", () => {
          imgWrap.innerHTML = "<span>🎬</span>";
        });
        imgWrap.appendChild(video);
      } else {
        const img = document.createElement("img");
        img.className = styles.tagImg;
        img.src = item.image;
        img.loading = "lazy";
        img.onerror = () => (imgWrap.innerHTML = "<span>🖼</span>");
        imgWrap.appendChild(img);
      }

      // ========== 重点改造：不再渲染原始文件名，使用 @图X 格式 ==========
      const labelText = document.createElement("span");
      labelText.className = styles.tagLabel;
      // 优先读取已有序号，没有则按类型分配新序号（视频 / 图片各自从 1 开始）
      let seq = assetIdToSeqRef.current.get(assetId);
      if (seq === undefined) {
        seq = allocateSeq(item);
      }
      labelText.textContent = `${getAssetRefPrefix(item)}${seq}`;

      tagEl.append(imgWrap, labelText);
      outerShell.appendChild(tagEl);
      return outerShell;
    },
    [allocateSeq],
  );

  // ==================== 插入@素材 ====================
  const insertAssetTag = useCallback(
    (item) => {
      console.log("[0] insertAssetTag 被调用, item =", item);
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
      isLocalModifyRef.current = true;
      const newHtml = editor.innerHTML;
      lastSyncedHtmlRef.current = newHtml;
      console.log("[1] insertAssetTag 即将 onChangeHtml, newHtml =", newHtml);
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

      // 延迟解锁，对齐防抖300ms周期
      setTimeout(() => {
        console.log("[6] setTimeout 解锁 lockSync 和 isInserting");
        lockSyncRef.current = false;
        isInsertingRef.current = false;
      }, 320);
      setMentionVisible(false);
      mentionVisibleRef.current = false;
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
      isLocalModifyRef.current = true;
      const newHtml = editor.innerHTML;
      lastSyncedHtmlRef.current = newHtml;
      onChangeHtml(newHtml);

      // 获取当前完整的 assetList 并替换对应项
      const currentAssetList = getCurrentAssetList();
      const updatedAssetList = currentAssetList.map((a) =>
        a.id === oldAssetId ? assetItem : a,
      );
      // 如果是新增的素材，更新追踪的 ID
      if (!currentAssetList.some((a) => a.id === assetItem.id)) {
        addedAssetIdsRef.current.add(assetItem.id);
      }
      setLocalAssetList(updatedAssetList);
      onChangeAssetList(updatedAssetList);

      setTimeout(() => (lockSyncRef.current = false), 320);
      setMentionVisible(false);
      mentionVisibleRef.current = false;
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
    console.log("[开始] handleSelectAsset", {
      item,
      replaceTarget: replaceTargetRef.current,
    });
    if (replaceTargetRef.current) replaceAssetTag(item);
    else insertAssetTag(item);
    resetSelection();
  };

  // 上移选中项
  const handleMoveUp = () => {
    setSelectedIndex((prev) =>
      prev > 0 ? prev - 1 : localAssetList.length - 1,
    );
  };

  // 下移选中项
  const handleMoveDown = () => {
    setSelectedIndex((prev) =>
      prev < localAssetList.length - 1 ? prev + 1 : 0,
    );
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
    lastSyncedHtmlRef.current = html;
    isLocalModifyRef.current = true;
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
      const deletedAssetId =
        outerShell.querySelector("[data-asset-id]")?.dataset?.assetId;
      outerShell.remove();

      lockSyncRef.current = true;
      isLocalModifyRef.current = true;
      const newHtml = editorRef.current.innerHTML;
      lastSyncedHtmlRef.current = newHtml;
      onChangeHtml(newHtml);

      // 从 assetList 中移除被删除的素材
      if (deletedAssetId) {
        // 1. 删除序号映射
        assetIdToSeqRef.current.delete(deletedAssetId);

        // 2. 重建剩余素材的序号映射（按类型分组，每组各自从 1 紧凑重排）
        const currentAssetList = getCurrentAssetList();
        const remainingAssets = currentAssetList.filter(
          (a) => a.id !== deletedAssetId,
        );
        rebuildSeqMap(remainingAssets);

        // 3. 过滤本地素材列表
        const updatedAssetList = remainingAssets;
        addedAssetIdsRef.current.delete(deletedAssetId);
        setLocalAssetList(updatedAssetList);
        // 同步父组件更新refAssetList
        onChangeAssetList(updatedAssetList);

        // 4. 刷新编辑器内所有原子块的序号文字
        if (editorRef.current) {
          // 用最新的 assetList 构建 id → item 的映射，用于根据素材类型决定前缀
          const idToItem = new Map(remainingAssets.map((a) => [a.id, a]));
          editorRef.current
            .querySelectorAll("[data-asset-id]")
            .forEach((tag) => {
              const aid = tag.dataset.assetId;
              const newSeq = assetIdToSeqRef.current.get(aid);
              if (newSeq !== undefined) {
                const labelSpan = tag.querySelector(`.${styles.tagLabel}`);
                if (labelSpan) {
                  labelSpan.textContent = `${getAssetRefPrefix(idToItem.get(aid))}${newSeq}`;
                }
              }
            });
        }
      }

      setTimeout(() => (lockSyncRef.current = false), 320);

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
    [
      onChangeHtml,
      onChangeAssetList,
      getCurrentAssetList,
      handleMoveUp,
      handleMoveDown,
      handleConfirm,
      rebuildSeqMap,
    ],
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
        mentionVisibleRef.current = false;
      }
    };
    window.addEventListener("mousedown", closePop);
    return () => window.removeEventListener("mousedown", closePop);
  }, []);

  // 拦截粘贴，仅保留纯文本，避免带入外部 HTML 样式（div 块、border 等）
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData(
      "text/plain",
    );
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

  // 父组件外部html同步到编辑器【修复关闭弹窗重开清空素材核心逻辑】
  useEffect(() => {
    console.log(
      "[4] sync effect, html =",
      html?.substring?.(0, 50),
      "lastSyncedHtmlRef =",
      lastSyncedHtmlRef.current?.substring?.(0, 50),
    );
    // 同步锁开启，直接跳过
    if (lockSyncRef.current || !editorRef.current) return;
    // 过滤报错栈内容
    if (typeof html === "string" && html.includes("Error Component Stack")) {
      console.warn("[5] 检测到 Error Component Stack，跳过覆写");
      return;
    }

    // 新增保护：外部传空字符串，但本地有素材，禁止清空DOM
    const localHasContent = !!lastSyncedHtmlRef.current?.trim();
    const outerInputEmpty = !html?.trim();
    if (localHasContent && outerInputEmpty) {
      console.warn("[拦截] 外部传入空html，本地存在有效素材，禁止清空编辑器");
      return;
    }

    // 本地刚操作完，store回传html只更新快照、不覆盖DOM
    if (isLocalModifyRef.current) {
      lastSyncedHtmlRef.current = html || "";
      isLocalModifyRef.current = false;
      return;
    }

    // 内容完全一致无需更新
    if (html === lastSyncedHtmlRef.current) return;

    // 只有合法新html才覆写DOM
    const editor = editorRef.current;
    console.warn(
      "[6] 同步覆写 innerHTML, lastSyncedHtml =",
      lastSyncedHtmlRef.current?.substring?.(0, 50),
      "→ html =",
      html?.substring?.(0, 50),
    );
    console.log("[7] 覆写前 innerHTML =", editor.innerHTML);
    editor.innerHTML = html || "";
    lastSyncedHtmlRef.current = html || "";
    console.log("[8] 覆写后 innerHTML =", editor.innerHTML);
    cleanEmptyTextNodes(editor);
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
          id="zyg-prompt-editor"
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
                {isVideoItem(item) ? (
                  <video
                    src={item.url}
                    className={styles.itemThumb}
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      try {
                        e.currentTarget.currentTime = 0.1;
                      } catch (_) {
                        /* 忽略 */
                      }
                    }}
                  />
                ) : (
                  <img src={item.image} alt="" className={styles.itemThumb} />
                )}
                <span className={styles.itemLabel}>{item.label}</span>
              </div>
              <span className={styles.itemIdTag}>
                {`${getAssetRefPrefix(item)}${assetIdToSeqRef.current.get(item.id) ?? "?"}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromptInputArea;
