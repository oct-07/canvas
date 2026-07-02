import { useCallback, useEffect, useRef, useState } from "react";
// 改为CSS Modules导入
import styles from "./PromptInputArea.module.css";

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
  prompt,
  onChangePrompt = () => {},
  assetList = defaultAssetList,
}) => {
  const editorRef = useRef(null);
  const wrapRef = useRef(null);
  const lockRef = useRef(false);

  const [atMentionVisible, setAtMentionVisible] = useState(false);
  const [atMentionStyle, setAtMentionStyle] = useState({ left: 0, top: 0 });
  const savedRangeRef = useRef(null);
  const replaceTargetRef = useRef(null);

  const closestByClass = useCallback((el, className) => {
    let node = el;
    while (node && node.nodeType === 1) {
      if (node.classList.contains(className)) return node;
      node = node.parentNode;
    }
    return null;
  }, []);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel.rangeCount) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const updateAtAnchorPosition = useCallback(() => {
    const editor = editorRef.current;
    const wrap = wrapRef.current;
    if (!editor || !wrap) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    setAtMentionStyle({
      left: rect.left - wrapRect.left,
      top: rect.bottom - wrapRect.top + 8,
    });
  }, []);

  const cleanWhitespaceNodes = useCallback((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const removeList = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) removeList.push(node);
    }
    removeList.forEach((n) => n.parentNode?.removeChild(n));
  }, []);

  const createAtItem = useCallback(
    (item) => {
      const atItem = document.createElement("span");
      atItem.className = styles.atItem;
      atItem.contentEditable = "false";
      atItem.dataset.id = `${item.type}${item.main_id}`;

      atItem.onclick = (e) => {
        e.stopPropagation();
        replaceTargetRef.current = atItem;
        const rect = atItem.getBoundingClientRect();
        const wrapRect = wrapRef.current.getBoundingClientRect();
        setAtMentionStyle({
          left: rect.left - wrapRect.left,
          top: rect.bottom - wrapRect.top + 6,
        });
        setAtMentionVisible(true);
      };

      const imgBox = document.createElement("div");
      imgBox.className = styles.atImgBox;
      const img = document.createElement("img");
      img.className = styles.atImg;
      img.src = item.image;
      img.loading = "lazy";
      img.onerror = () => {
        img.style.display = "none";
        const placeholder = document.createElement("div");
        placeholder.className = styles.atImgPlaceholder;
        placeholder.innerHTML = "<i>🖼</i>";
        imgBox.appendChild(placeholder);
      };
      imgBox.appendChild(img);

      const textSpan = document.createElement("span");
      textSpan.className = styles.atText;
      textSpan.textContent = item.label;

      atItem.append(imgBox, textSpan);
      return atItem;
    },
    [styles],
  );

  const insertAtItem = useCallback(
    (item) => {
      const editor = editorRef.current;
      const sel = window.getSelection();
      let useRange = null;

      if (savedRangeRef.current) {
        const r = savedRangeRef.current;
        if (editor.contains(r.startContainer)) {
          useRange = r;
        }
        savedRangeRef.current = null;
      }
      if (!useRange && sel.rangeCount) {
        useRange = sel.getRangeAt(0);
      }

      const range = useRange || document.createRange();
      if (useRange) {
        const textNode = range.startContainer;
        const offset = range.startOffset;
        if (textNode.nodeType === Node.TEXT_NODE && offset >= 1) {
          textNode.textContent =
            textNode.textContent.slice(0, offset - 1) +
            textNode.textContent.slice(offset);
          range.setStart(textNode, offset - 1);
          range.collapse(true);
        }
      } else {
        const lastChild = editor.lastChild;
        if (lastChild) range.setStartAfter(lastChild);
        else range.selectNodeContents(editor);
        range.collapse(true);
      }

      sel.removeAllRanges();
      sel.addRange(range);

      const cardDom = createAtItem(item);
      range.deleteContents();
      range.insertNode(cardDom);
      range.setStartAfter(cardDom);
      range.setEndAfter(cardDom);
      sel.removeAllRanges();
      sel.addRange(range);

      setAtMentionVisible(false);
      lockRef.current = true;
      onChangePrompt(editor.innerHTML);
      setTimeout(() => (lockRef.current = false), 0);
    },
    [createAtItem, onChangePrompt],
  );

  const handleAtSelect = useCallback(
    (item) => {
      const editor = editorRef.current;
      if (replaceTargetRef.current) {
        const oldDom = replaceTargetRef.current;
        const newDom = createAtItem(item);
        oldDom.parentNode.insertBefore(newDom, oldDom);
        oldDom.remove();
        replaceTargetRef.current = null;
        lockRef.current = true;
        onChangePrompt(editor.innerHTML);
        setTimeout(() => (lockRef.current = false), 0);
      } else {
        insertAtItem(item);
      }
      setAtMentionVisible(false);
    },
    [createAtItem, insertAtItem, onChangePrompt],
  );

  const handleInput = useCallback(() => {
    if (lockRef.current) return;
    const editor = editorRef.current;
    const html = editor.innerHTML;
    onChangePrompt(html);
    if (atMentionVisible) updateAtAnchorPosition();
  }, [onChangePrompt, atMentionVisible, updateAtAnchorPosition]);

  const handleKeyUp = useCallback(
    (e) => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      const text = node.textContent;
      const offset = range.startOffset;
      if (offset < 1) return;
      if (text[offset - 1] === "@") {
        saveSelection();
        updateAtAnchorPosition();
        setAtMentionVisible(true);
      }
    },
    [saveSelection, updateAtAnchorPosition],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key !== "Backspace") return;
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      const atItem = closestByClass(node, styles.atItem);
      if (!atItem) return;
      e.preventDefault();
      const prev = atItem.previousSibling;
      atItem.remove();
      lockRef.current = true;
      onChangePrompt(editorRef.current.innerHTML);
      setTimeout(() => (lockRef.current = false), 0);

      const newRange = document.createRange();
      if (prev) {
        if (prev.nodeType === Node.TEXT_NODE)
          newRange.setStart(prev, prev.textContent.length);
        else newRange.setStartAfter(prev);
      } else {
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(true);
      }
      sel.removeAllRanges();
      sel.addRange(newRange);
    },
    [closestByClass, onChangePrompt, styles],
  );

  const handleClick = useCallback(
    (e) => {
      if (editorRef.current.contains(e.target) && atMentionVisible) {
        updateAtAnchorPosition();
      }
    },
    [atMentionVisible, updateAtAnchorPosition],
  );

  useEffect(() => {
    const globalClick = (e) => {
      const wrap = wrapRef.current;
      const popoverClass = `.${styles.atMediaPopover}`;
      const popover = document.querySelector(popoverClass);
      if (!wrap.contains(e.target) && popover && !popover.contains(e.target)) {
        setAtMentionVisible(false);
      }
    };
    window.addEventListener("mousedown", globalClick);
    return () => window.removeEventListener("mousedown", globalClick);
  }, [styles]);

  useEffect(() => {
    if (lockRef.current) return;
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== prompt) {
      editor.innerHTML = prompt || "";
      cleanWhitespaceNodes(editor);
      editor.focus();
    }
  }, [prompt, cleanWhitespaceNodes]);

  const filterAssets = assetList;

  return (
    <div ref={wrapRef} className={styles.promptEditorWrap}>
      <div
        ref={editorRef}
        className={styles.promptEditor}
        contentEditable="true"
        data-placeholder="请输入提示词...输入@引用素材"
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleClick}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        onWheelCapture={(e) => e.stopPropagation()}
      />

      {atMentionVisible && filterAssets.length > 0 && (
        <div className={styles.atMediaPopover} style={atMentionStyle}>
          {filterAssets.map((item) => (
            <div
              key={`${item.type}${item.main_id}`}
              className={styles.mentionItem}
              onClick={() => handleAtSelect(item)}
            >
              <div className={styles.itemLeft}>
                <img src={item.image} alt="" />
                <span>{item.label}</span>
              </div>
              <span className={styles.itemTag}>@{item.main_id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromptInputArea;
