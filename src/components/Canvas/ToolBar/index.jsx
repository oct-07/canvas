import { Input, Tooltip, Button, message } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  UserOutlined,
} from '@ant-design/icons';
import useCanvasStore from '@/store/canvasStore';

const ToolBar = () => {
  const {
    canvasName,
    setCanvasName,
    undo,
    redo,
    canUndo,
    canRedo,
    nodes,
    edges,
  } = useCanvasStore();

  const handleZoomIn = () => {
    // 通过 CanvasStore 的 viewport 状态来控制
    message.info('使用鼠标滚轮缩放画布');
  };

  const handleZoomOut = () => {
    message.info('使用鼠标滚轮缩放画布');
  };

  const handleFitView = () => {
    message.info('点击 Controls 控件的适应视图按钮');
  };

  const handleSave = () => {
    const data = {
      nodes,
      edges,
      canvasName,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('canvas-data', JSON.stringify(data));
    message.success('画布已保存');
  };

  const zoomPercent = 100; // 可通过 viewport 获取实际缩放比例

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      {/* 撤销/重做 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: '#2a2a2a',
          padding: '4px 8px',
          borderRadius: '8px',
        }}
      >
        <Tooltip title="撤销 (Cmd+Z)">
          <Button
            type="text"
            icon={<UndoOutlined />}
            onClick={undo}
            disabled={!canUndo()}
            style={{ color: canUndo() ? '#fff' : '#666' }}
          />
        </Tooltip>

        <Tooltip title="重做 (Cmd+Shift+Z)">
          <Button
            type="text"
            icon={<RedoOutlined />}
            onClick={redo}
            disabled={!canRedo()}
            style={{ color: canRedo() ? '#fff' : '#666' }}
          />
        </Tooltip>
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '24px', background: '#434343' }} />

      {/* 缩放控制 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: '#2a2a2a',
          padding: '4px 8px',
          borderRadius: '8px',
        }}
      >
        <Tooltip title="缩小">
          <Button
            type="text"
            icon={<ZoomOutOutlined />}
            onClick={handleZoomOut}
            style={{ color: '#fff' }}
          />
        </Tooltip>

        <div
          style={{
            minWidth: '48px',
            textAlign: 'center',
            color: '#fff',
            fontSize: '12px',
          }}
        >
          {zoomPercent}%
        </div>

        <Tooltip title="放大">
          <Button
            type="text"
            icon={<ZoomInOutlined />}
            onClick={handleZoomIn}
            style={{ color: '#fff' }}
          />
        </Tooltip>

        <Tooltip title="适应视图">
          <Button
            type="text"
            icon={<ExpandOutlined />}
            onClick={handleFitView}
            style={{ color: '#fff' }}
          />
        </Tooltip>
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '24px', background: '#434343' }} />

      {/* 保存按钮 */}
      <Tooltip title="保存画布 (Ctrl+S)">
        <Button
          type="text"
          icon={<SaveOutlined />}
          onClick={handleSave}
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
        >
          保存
        </Button>
      </Tooltip>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '24px', background: '#434343' }} />

      {/* 用户头像 */}
      <Tooltip title="用户设置">
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <UserOutlined style={{ color: '#fff', fontSize: '14px' }} />
        </div>
      </Tooltip>
    </div>
  );
};

export default ToolBar;
