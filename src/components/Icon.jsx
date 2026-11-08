const paths = {
  clock: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", "M12 7v5l3 2"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  pause: ["M8 5v14", "M16 5v14"],
  play: ["m8 5 11 7-11 7z"],
  compass: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", "m16 8-2.5 5.5L8 16l2.5-5.5Z"],
  messageCircle: ["M21 11.5a8.5 8.5 0 0 1-12.8 7.3L3 21l2.2-5.2A8.5 8.5 0 1 1 21 11.5Z"],
  clapperboard: ["M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z", "m3 9-1-5 18-3 1 5Z", "m8 3 3 4", "m14 2 3 4"],
  building: ["M5 21V3h14v18", "M3 21h18", "M9 7h1", "M14 7h1", "M9 11h1", "M14 11h1", "M10 21v-6h4v6"],
  home: ["M3 11.5 12 4l9 7.5", "M5 10v10h14V10", "M9 20v-6h6v6"],
  grid: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"],
  message: ["M4 5h16v12H8l-4 3z"],
  video: ["M4 6h11v12H4z", "m15 10 5-3v10l-5-3z"],
  person: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 21a8 8 0 0 1 16 0"],
  search: ["M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z", "m21 21-4.35-4.35"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  cart: ["M3 3h2l2 12h10l3-8H6", "M9 20h.01", "M17 20h.01"],
  workers: ["M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M16 11a3 3 0 1 0 0-6", "M2 21a6 6 0 0 1 12 0", "M14 15a5 5 0 0 1 8 4"],
  car: ["M5 17h14l-1-7-2-4H8L6 10z", "M7 17v2", "M17 17v2", "M6 12h12"],
  devices: ["M5 3h10v14H5z", "M9 20h2", "M17 8h4v11h-6"],
  sparkles: ["m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4z", "m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"],
  calendar: ["M4 5h16v15H4z", "M8 3v4", "M16 3v4", "M4 10h16"],
  paw: ["M8 11c-2 0-3-2-2-4s3-1 4 1 0 3-2 3Z", "M16 11c-2 0-3-2-2-4s3-1 4 1 0 3-2 3Z", "M12 13c4 0 6 6 2 7h-4c-4-1-2-7 2-7Z"],
  rupee: ["M7 5h10", "M7 9h10", "M7 5h4a4 4 0 0 1 0 8H7l8 7"],
  megaphone: ["M3 11v4h4l9 4V7L7 11z", "M7 15l2 5"],
  briefcase: ["M4 7h16v13H4z", "M9 7V4h6v3", "M4 12h16"],
  truck: ["M3 6h11v11H3z", "M14 10h4l3 3v4h-7z", "M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  drop: ["M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"],
  chevronRight: ["m9 18 6-6-6-6"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  logout: ["M9 5H5v14h4", "m15 8 4 4-4 4", "M19 12H9"],
  arrowLeft: ["m15 18-6-6 6-6", "M9 12h10"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  check: ["m5 12 4 4L19 6"],
  shield: ["M12 3 20 7v5c0 5-3 8-8 10-5-2-8-5-8-10V7z", "m9 12 2 2 4-4"],
  star: ["m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9L6 20l1-6.1L2.6 9.4l6.1-.9z"],
  clipboard: ["M7 5h10v16H7z", "M9 3h6v4H9z"],
  dashboard: ["M4 4h7v7H4z", "M13 4h7v4h-7z", "M13 10h7v10h-7z", "M4 13h7v7H4z"],
  chart: ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"],
  history: ["M3 12a9 9 0 1 0 3-6.7", "M3 4v6h6", "M12 7v5l3 2"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7L10.5 2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7L-1 10.5v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7z"],
  plus: ["M12 5v14", "M5 12h14"],
  location: ["M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z", "M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  volume: ["M11 5 6 9H3v6h3l5 4z", "M15.5 8.5a5 5 0 0 1 0 7", "M18.5 5.5a9 9 0 0 1 0 13"],
  volumeOff: ["M11 5 6 9H3v6h3l5 4z", "m22 9-6 6", "m16 9 6 6"],
  share: ["M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7", "m16 6-4-4-4 4", "M12 2v13"],
  external: ["M14 4h6v6", "M20 4 10 14", "M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"],
  mail: ["M4 5h16v14H4z", "m4 7 8 6 8-6"],
  eye: ["M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  eyeOff: ["M3 3l18 18", "M10.6 6.2A10.9 10.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.3 3.9", "M6.6 7.1A17 17 0 0 0 2 12s3.5 6 10 6a10.6 10.6 0 0 0 4.2-.85", "M9.9 9.9a3 3 0 0 0 4.2 4.2"],
};

export default function Icon({ name, size = 22, className = "", title }) {
  const iconPaths = paths[name] ?? paths.grid;
  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      focusable="false"
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {iconPaths.map((d, index) => <path d={d} key={`${name}-${index}`} />)}
    </svg>
  );
}
