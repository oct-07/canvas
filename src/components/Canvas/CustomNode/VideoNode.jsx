import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import useCanvasStore from '@/store/canvasStore';

/**
 * 视频节点组件 - 显示视频缩略图的节点
 * 支持播放图标、选中状态和删除操作
 */
const VideoNode = memo(({ id, data, selected }) => {
  const removeNode = useCanvasStore((state) => state.removeNode);

  return (
    <div
      style={{
        width: '240px',
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
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#177ddc', width: 8, height: 8 }}
      />

      <div
        style={{
          height: '160px',
          background: `url(${data.thumbnail || 'https://picsum.photos/240/160'}) center/cover no-repeat`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(23, 125, 220, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <PlayCircleOutlined style={{ color: '#fff', fontSize: '24px' }} />
        </div>

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '8px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
            display: 'flex',
            justifyContent: 'flex-end',
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        >
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
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
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
              flex: 1,
            }}
          >
            {data.name || 'Video'}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#177ddc', width: 8, height: 8 }}
      />
    </div>
  );
});

VideoNode.displayName = 'VideoNode';

export default VideoNode;
