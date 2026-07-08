import { CloseCircleOutlined, LoadingOutlined } from "@ant-design/icons";

const overlayBaseStyle = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: 16,
  borderRadius: 12,
  color: "#fff",
  textAlign: "center",
  zIndex: 2,
  pointerEvents: "auto",
};

const pendingStyle = {
  ...overlayBaseStyle,
  background: "rgba(0, 0, 0, 0.55)",
  backdropFilter: "blur(2px)",
};

const failedStyle = {
  ...overlayBaseStyle,
  background: "rgba(80, 20, 20, 0.72)",
  backdropFilter: "blur(2px)",
};

const messageStyle = {
  fontSize: 14,
  color: "#fff",
  maxWidth: "85%",
  wordBreak: "break-word",
  lineHeight: 1.5,
};

const errorTextStyle = {
  fontSize: 12,
  color: "rgba(255, 200, 200, 0.95)",
  maxWidth: "85%",
  wordBreak: "break-word",
  lineHeight: 1.4,
};

const GenerationOverlay = ({ status, error }) => {
  if (status !== "pending" && status !== "failed") return null;

  if (status === "pending") {
    return (
      <div style={pendingStyle}>
        <LoadingOutlined style={{ fontSize: 36, color: "#177ddc" }} spin />
        <span style={messageStyle}>生成中…</span>
      </div>
    );
  }

  return (
    <div style={failedStyle}>
      <CloseCircleOutlined style={{ fontSize: 32, color: "#ff7875" }} />
      <span style={messageStyle}>生成失败</span>
      {error && <span style={errorTextStyle}>{error}</span>}
    </div>
  );
};

export default GenerationOverlay;
