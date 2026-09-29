type ObjectKind = 'disk' | 'mail' | 'trash' | 'key' | 'document' | 'monitor' | 'tools' | 'tag';

/** Decorative desktop artwork; the enclosing control supplies its accessible name. */
export function DesktopObject({kind='document'}:{kind?:ObjectKind}) {
  return <svg className="desktop-object" viewBox="0 0 40 40" aria-hidden="true" shapeRendering="crispEdges" fill="none" stroke="#303442" strokeWidth="1.5">
    {kind==='disk'?<><path fill="#a9badb" d="M5 4h27l4 4v28H5Z"/><path fill="#f7f5e9" d="M11 4h18v12H11zM10 23h21v13H10z"/><path fill="#727d99" d="M23 5h4v9h-4z"/><path stroke="#8f96a5" d="M14 27h13M14 31h13"/></>:
    kind==='mail'?<><path fill="#d5ddeb" d="M3 12h34v23H3z"/><path fill="#fff9dc" d="m3 12 17 14 17-14Z"/><path d="m3 35 12-14m22 14L25 21"/><path stroke="white" d="M5 14v18"/></>:
    kind==='trash'?<><path fill="#dbcbac" d="m9 11 2 25h19l2-25Z"/><path fill="#f5edd8" d="M6 8h29v5H6zM16 4h10v4H16z"/><path stroke="#8a7d67" d="M15 17v15m6-15v15m5-15v15"/></>:
    kind==='key'?<><path fill="#edcf79" d="M8 4h14l6 6v12l-7 6v9h-6v-4h-4v-5l-7-7V10Z"/><path fill="#f7f5e9" d="M12 9h8v8h-8z"/><path stroke="#fff4c5" d="M8 11v9l8 8"/></>:
    kind==='monitor'?<><path fill="#d6d9de" d="M3 3h34v25H3zM16 28h8v5H16zM10 33h20v4H10z"/><path fill="#8badd1" d="M7 7h26v16H7z"/><path stroke="#eff9ff" d="M9 9h22M9 11v9"/><path d="M29 26h3"/></>:
    kind==='tools'?<><path fill="#e8e9df" d="M4 5h32v30H4z"/><path fill="#99aec8" d="M8 12h24v4H8zM8 24h24v4H8z"/><path fill="#e7c98f" d="M14 9h5v10h-5zM24 21h5v10h-5z"/></>:
    kind==='tag'?<><path fill="#c6dca3" d="m4 5 18 1 14 17-16 14L4 20Z"/><path fill="#fffef5" d="M9 10h5v5H9z"/><path d="m16 18 10 11m-6-15 10 11"/></>:
    <><path fill="#fffef4" d="M8 3h18l7 7v27H8Z"/><path fill="#b6c5dd" d="M26 3v8h7"/><path stroke="#7c899e" d="M13 16h15M13 21h15M13 26h15M13 31h10"/></>}
    <path stroke="#ffffff99" d="M1 39h37"/>
  </svg>;
}
