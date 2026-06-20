import { forwardRef } from 'react';
import MapPanel from './MapPanel';
import AmapMapPanel from './AmapMapPanel';
import { isAmap } from '../../providers/mapProvider';

// 按设备地图服务商偏好选择底图面板;props/ref 原样转发。
// 切换 provider 需重载页面(见 Navbar),故 isAmap() 在一次会话内稳定。
const ProviderMapPanel = forwardRef(function ProviderMapPanel(props, ref) {
  const Panel = isAmap() ? AmapMapPanel : MapPanel;
  return <Panel ref={ref} {...props} />;
});

export default ProviderMapPanel;
