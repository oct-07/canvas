import { Input } from "antd";
import { useState, useEffect } from "react";

export default function CanvasTitleEdit({ defaultValue = "" }) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <div style={{ width: 240, background: "#1f1f1f", borderRadius: 8 }}>
      <Input
        placeholder="请输入画布名称"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ width: "100%" }}
      />
    </div>
  );
}
