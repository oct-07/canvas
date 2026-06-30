import { Input } from "antd";

const PromptInputArea = ({ prompt, onChangePrompt }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <Input.TextArea
        value={prompt}
        onChange={(e) => onChangePrompt(e.target.value)}
        placeholder="可直接文字生图，或上传图片输入文字指令对图片进行编辑，如：将背景改为雪夜"
        autoSize={{ minRows: 5, maxRows: 10 }}
        variant="borderless"
        style={{ background: "transparent", fontSize: 16 }}
      />
    </div>
  );
};

export default PromptInputArea;
