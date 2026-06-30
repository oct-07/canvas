import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import useCanvasStore from '@/store/canvasStore';

/**
 * 图片节点组件 - 显示图片缩略图的节点
 * 左侧为 Input（接收图片），右侧为 Output（输出图片）
 * 数据类型: IMAGE
 */
const ImageNode = memo(({ id, data, selected }) => {
  const removeNode = useCanvasStore((state) => state.removeNode);

  return (
    <div
      style={{
        width: '200px',
        background: '#262626',
        borderRadius: '12px',
        border: selected ? '2px solid #177ddc' : '1px solid #303030',
        overflow: 'hidden',
        boxShadow: selected
          ? '0 0 20px rgba(23, 125, 220, 0.3)'
          : '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* 左侧 Input 端口 - 接收图片输入 */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          background: '#1890ff',
          width: 10,
          height: 10,
          border: '2px solid #262626',
          left: -5,
        }}
      />

      <div
        style={{
          height: '150px',
          background: `url(${data.url || data.thumbnail}) center/cover no-repeat`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '8px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        >
          <EditOutlined
            style={{ color: '#fff', cursor: 'pointer', fontSize: '14px' }}
            onClick={() => console.log('Edit image:', id)}
          />
          <DeleteOutlined
            style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: '14px' }}
            onClick={() => removeNode(id)}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '8px',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: '12px',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {data.name || 'Image'}
          </span>
        </div>
      </div>

      {/* 右侧 Output 端口 - 输出图片 */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          background: '#1890ff',
          width: 10,
          height: 10,
          border: '2px solid #262626',
          right: -5,
        }}
      />
    </div>
  );
});

ImageNode.displayName = 'ImageNode';

export default ImageNode;
