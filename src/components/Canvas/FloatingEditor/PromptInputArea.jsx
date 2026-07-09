import { buildPurePromptText } from "@/utils/promptText";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
 * 根据素材类型返回引用前缀
 * 视频素材显示「视频」，图片素材显示「图片」
 */
const getAssetRefPrefix = (item) => (isVideoItem(item) ? "视频" : "图片");

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

const PromptInputArea = forwardRef(function PromptInputArea(
  {
    html = "",
    onChangeHtml = () => {},
    assetList = defaultAssetList,
    onChangeAssetList = () => {},
    isFullScreen = false,
    editorId,
  },
  ref,
) {
  // DOM容器
  const editorRef = useRef(null);
  const promptEditorRef = useRef(null);
  const wrapRef = useRef(null);
  const scrollWrapRef = useRef(null);

  const lockSyncRef = useRef(false);
  const lastSyncedHtmlRef = useRef(html);
  const isLocalModifyRef = useRef(false);

  const [mentionVisible, setMentionVisible] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({ left: 0, top: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const savedRangeRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const mentionVisibleRef = useRef(false);
  const isInsertingRef = useRef(false);
  const videoSeqRef = useRef(1);
  const imageSeqRef = useRef(1);
  const assetIdToSeqRef = useRef(new Map());
  const [localAssetList, setLocalAssetList] = useState(assetList);

  const allocateSeq = useCallback((item) => {
    const seqRef = isVideoItem(item) ? videoSeqRef : imageSeqRef;
    const seq = seqRef.current;
    seqRef.current += 1;
    if (item?.id) assetIdToSeqRef.current.set(item.id, seq);
    return seq;
  }, []);

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

  const addedAssetIdsRef = useRef(new Set());

  useEffect(() => {
    promptEditorRef.current = editorRef.current;
  });

  useEffect(() => {
    lastSyncedHtmlRef.current = html || "";
  }, []);

  useEffect(() => {
    const currentIds = new Set(localAssetList.map((a) => a.id));
    const mergedList = [...assetList];
    addedAssetIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        const addedAsset = localAssetList.find((a) => a.id === id);
        if (addedAsset) mergedList.push(addedAsset);
      }
    });
    setLocalAssetList(mergedList);
    rebuildSeqMap(mergedList);

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

  const getCurrentAssetList = useCallback(
    () => localAssetList,
    [localAssetList],
  );

  const buildPromptText = useCallback(() => {
    const editor = promptEditorRef.current || editorRef.current;
    if (!editor) return "";
    const { text } = buildPurePromptText(editor, {
      assetList: localAssetList,
      isVideo: isVideoItem,
      getSeq: (assetId) => assetIdToSeqRef.current.get(assetId),
    });
    return text;
  }, [localAssetList]);

  useImperativeHandle(ref, () => ({ getPromptText: () => buildPromptText() }), [
    buildPromptText,
  ]);

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

  const fixSelectionRange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return false;
    const range = sel.getRangeAt(0);
    let containerEl = range.startContainer;
    if (containerEl.nodeType === Node.TEXT_NODE)
      containerEl = containerEl.parentElement;
    if (!containerEl) return false;
    const outerShell = containerEl.closest('[contenteditable="false"]');
    if (!outerShell) return false;
    const shellRect = outerShell.getBoundingClientRect();
    const caretRect = range.getBoundingClientRect();
    const moveBefore = caretRect.left < shellRect.left + shellRect.width / 2;
    if (moveBefore)
      (range.setStartBefore(outerShell), range.setEndBefore(outerShell));
    else (range.setStartAfter(outerShell), range.setEndAfter(outerShell));
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }, []);

  useEffect(() => {
    const handler = () => requestAnimationFrame(fixSelectionRange);
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [fixSelectionRange]);

  const saveCurrentRange = useCallback(() => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0)
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  }, []);

  // ========== 弹窗坐标自动计算函数 ==========
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
    if (popoverRight > wrapInnerWidth) baseLeft = baseLeft - popoverWidth;
    if (baseLeft < 8) baseLeft = 8;
    setPopoverStyle({
      left: baseLeft,
      top: caretRect.bottom - wrapRect.top + 8,
    });
  }, []);

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

      // 点击标签手动计算弹窗位置
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
        setSelectedIndex(0);
      });

      const imgWrap = document.createElement("div");
      imgWrap.className = styles.tagImgWrap;

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
          } catch (_) {}
        });
        video.addEventListener(
          "error",
          () => (imgWrap.innerHTML = "<span>🎬</span>"),
        );
        imgWrap.appendChild(video);
      } else {
        const img = document.createElement("img");
        img.className = styles.tagImg;
        img.src = item.image;
        img.loading = "lazy";
        img.onerror = () => (imgWrap.innerHTML = "<span>🖼</span>");
        imgWrap.appendChild(img);
      }

      const labelText = document.createElement("span");
      labelText.className = styles.tagLabel;
      let seq = assetIdToSeqRef.current.get(assetId);
      if (seq === undefined) seq = allocateSeq(item);
      labelText.textContent = `${getAssetRefPrefix(item)}${seq}`;

      tagEl.append(imgWrap, labelText);
      outerShell.appendChild(tagEl);
      return outerShell;
    },
    [allocateSeq],
  );

  const insertAssetTag = useCallback(
    (item) => {
      const editor = editorRef.current;
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      isInsertingRef.current = true;
      let currentRange = sel.getRangeAt(0);
      let startNode = currentRange.startContainer;
      let insertOffset = currentRange.startOffset;

      if (startNode.nodeType === Node.TEXT_NODE) {
        const text = startNode.textContent;
        let atPos = -1;
        for (let i = insertOffset - 1; i >= 0; i--) {
          if (text[i] === "@") {
            atPos = i;
            break;
          }
        }
        if (atPos >= 0) {
          startNode.textContent = text.slice(0, atPos) + text.slice(atPos + 1);
          insertOffset = atPos;
        }
      }

      const assetItem = { ...item, id: item.id || generateAssetId() };
      const tagDom = createAssetTag(assetItem);
      const newRange = document.createRange();
      if (startNode.nodeType === Node.TEXT_NODE) {
        newRange.setStart(startNode, insertOffset);
      } else {
        newRange.selectNodeContents(editor);
        newRange.collapse(false);
      }
      newRange.collapse(true);
      newRange.insertNode(tagDom);

      const finalRange = document.createRange();
      finalRange.setStartAfter(tagDom);
      finalRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(finalRange);

      lockSyncRef.current = true;
      isLocalModifyRef.current = true;
      const newHtml = editor.innerHTML;
      lastSyncedHtmlRef.current = newHtml;
      onChangeHtml(newHtml);

      const currentAssetList = getCurrentAssetList();
      const updatedAssetList = [...currentAssetList];
      if (!updatedAssetList.some((a) => a.id === assetItem.id)) {
        updatedAssetList.push(assetItem);
        addedAssetIdsRef.current.add(assetItem.id);
      }
      setLocalAssetList(updatedAssetList);
      onChangeAssetList(updatedAssetList);

      setTimeout(() => {
        lockSyncRef.current = false;
        isInsertingRef.current = false;
      }, 320);
      // 插入后关闭弹窗
      resetSelection();
      savedRangeRef.current = null;
    },
    [createAssetTag, onChangeHtml, onChangeAssetList, getCurrentAssetList],
  );

  const replaceAssetTag = useCallback(
    (item) => {
      if (!replaceTargetRef.current) return;
      const editor = editorRef.current;
      const oldInnerTag = replaceTargetRef.current;
      const oldShell = oldInnerTag.parentElement;
      const oldAssetId = oldInnerTag.dataset.assetId;
      const assetItem = { ...item, id: item.id || generateAssetId() };
      const newShell = createAssetTag(assetItem);
      oldShell.parentNode.insertBefore(newShell, oldShell);
      oldShell.remove();
      replaceTargetRef.current = null;

      lockSyncRef.current = true;
      isLocalModifyRef.current = true;
      const newHtml = editor.innerHTML;
      lastSyncedHtmlRef.current = newHtml;
      onChangeHtml(newHtml);

      const currentAssetList = getCurrentAssetList();
      const updatedAssetList = currentAssetList.map((a) =>
        a.id === oldAssetId ? assetItem : a,
      );
      if (!currentAssetList.some((a) => a.id === assetItem.id)) {
        addedAssetIdsRef.current.add(assetItem.id);
      }
      setLocalAssetList(updatedAssetList);
      onChangeAssetList(updatedAssetList);

      setTimeout(() => (lockSyncRef.current = false), 320);
      resetSelection();
    },
    [createAssetTag, onChangeHtml, onChangeAssetList, getCurrentAssetList],
  );

  // 重置弹窗与选中索引
  const resetSelection = () => {
    setMentionVisible(false);
    mentionVisibleRef.current = false;
    setSelectedIndex(0);
  };

  const handleSelectAsset = (item) => {
    if (replaceTargetRef.current) replaceAssetTag(item);
    else insertAssetTag(item);
    resetSelection();
  };

  const handleInput = useCallback(() => {
    if (lockSyncRef.current || isInsertingRef.current) return;
    const html = editorRef.current.innerHTML;
    lastSyncedHtmlRef.current = html;
    isLocalModifyRef.current = true;
    onChangeHtml(html);
    cleanEmptyTextNodes(editorRef.current);
    // 输入时弹窗打开则刷新位置
    if (mentionVisible) updatePopoverPosition();
  }, [
    onChangeHtml,
    mentionVisible,
    updatePopoverPosition,
    cleanEmptyTextNodes,
  ]);

  const handleKeyUp = useCallback(
    (e) => {
      if (e.key === "Escape" && mentionVisibleRef.current) {
        resetSelection();
        return;
      }
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
    [saveCurrentRange, updatePopoverPosition],
  );

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
    [onChangeHtml, onChangeAssetList, getCurrentAssetList, rebuildSeqMap],
  );

  // 点击编辑器刷新弹窗位置
  const handleEditorClick = useCallback(() => {
    if (mentionVisible) updatePopoverPosition();
  }, [mentionVisible, updatePopoverPosition]);

  // 全局点击空白关闭弹窗
  useEffect(() => {
    const closePop = (e) => {
      const popover = document.querySelector(`.${styles.mentionPopover}`);
      if (wrapRef.current && popover && !wrapRef.current.contains(e.target)) {
        resetSelection();
      }
    };
    window.addEventListener("mousedown", closePop);
    return () => window.removeEventListener("mousedown", closePop);
  }, []);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData(
      "text/plain",
    );
    document.execCommand("insertText", false, text);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const scrollWrap = scrollWrapRef.current;
    if (!editor || !scrollWrap) return;
    const height = isFullScreen ? "400px" : "120px";
    editor.style.minHeight = height;
    scrollWrap.style.minHeight = height;
  }, [isFullScreen]);

  useEffect(() => {
    if (lockSyncRef.current || !editorRef.current) return;
    if (typeof html === "string" && html.includes("Error Component Stack"))
      return;
    const localHasContent = !!lastSyncedHtmlRef.current?.trim();
    const outerInputEmpty = !html?.trim();
    if (localHasContent && outerInputEmpty) return;
    if (isLocalModifyRef.current) {
      lastSyncedHtmlRef.current = html || "";
      isLocalModifyRef.current = false;
      return;
    }
    if (html === lastSyncedHtmlRef.current) return;
    const editor = editorRef.current;
    editor.innerHTML = html || "";
    lastSyncedHtmlRef.current = html || "";
    cleanEmptyTextNodes(editor);
  }, [html, cleanEmptyTextNodes]);

  return (
    <div ref={wrapRef} className={styles.editorWrap}>
      <div
        ref={scrollWrapRef}
        className={styles.scrollWrapper}
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <div
          ref={editorRef}
          id={editorId}
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

      {/* 弹窗 */}
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
                      } catch (_) {}
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
});

export default PromptInputArea;
