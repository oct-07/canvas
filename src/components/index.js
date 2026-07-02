/**
 * 组件统一导出
 */

// Canvas 画布组件
import ContextMenu from "./Canvas/ContextMenu";
import CustomEdge from "./Canvas/CustomEdge";
import CustomNode from "./Canvas/CustomNode";
import CustomPoint from "./Canvas/CustomPoint";
import Canvas from "./Canvas/index";
import SideBar from "./Canvas/SideBar";
import CommonUpload from "./Common/CommonUpload";
// 统一具名导出
export {
  Canvas,
  CommonUpload,
  ContextMenu,
  CustomEdge,
  CustomNode,
  CustomPoint,
  SideBar,
};
