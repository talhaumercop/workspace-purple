/** A small, pixel-aligned desktop folder. Identity is stable across every view. */
export function DesktopFolder({id,name,className=''}:{id:string;name:string;className?:string}) {
  const hash = Array.from(id).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
  const colors = ['#f3d584','#a8c9ed','#b9d99a','#eab4cb','#c4b5e3','#99d9d1'];
  const color = colors[hash % colors.length];
  return <svg className={`desktop-folder ${className}`} viewBox="0 0 40 34" fill="none" aria-hidden="true" shapeRendering="crispEdges">
    <path d="M3 5h13l4 4h17v22H3Z" fill={color} stroke="#303442" strokeWidth="2"/>
    <path d="M4 6h11l4 4h17" stroke="#fffef3" strokeWidth="2"/>
    <path d="M5 11h30v17H5Z" fill="#fffdf2" stroke="#687080"/>
    <path d="M2 15h36l-2 17H4Z" fill={color} stroke="#303442" strokeWidth="2"/>
    <path d="M4 16h32M5 17v12" stroke="#fffef3" strokeWidth="2"/>
    <path d="M6 30h28l1-12" stroke="#303442" strokeOpacity=".35"/>
    <rect x="16" y="20" width="10" height="8" fill="#fffdf2" stroke="#555c6b"/>
    <text x="21" y="26" textAnchor="middle" fill="#303442" stroke="none" fontFamily="Courier New,monospace" fontSize="7" fontWeight="bold">{name.trim().charAt(0).toUpperCase() || '+'}</text>
  </svg>;
}
