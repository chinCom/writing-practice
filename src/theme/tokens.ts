export const tokens = {
  light: {
    ink: '#111318',            // Carbon black-blue
    text: '#1A1D24',           // Heavy graphite
    onPrimary: '#FFFFFF',
    paper: '#F3F3EE',          // Raw gallery concrete / warm grey
    surface: '#FFFFFF',
    border: '#DFDFD8',         // Crisp architectural border
    muted: '#686B73',          // Neutral industrial grey
    violet: '#0047FF',         // Primary brand -> International Klein Cobalt
    mint: '#009E60',           // Signal green
    mintText: '#007A4A',
    blue: '#0066CC',
    amber: '#E07A00',
    rose: '#FF3B1D',           // Vermilion red-orange accent
    teal: '#008B94',
    highlighter: '#FFE600',    // Pure signal yellow
    highlightSoft: '#FFFCE0',
    tonalPrimary: '#E5EDFF',   // Crisp cobalt tint
    tonalSuccess: '#E3F7EE',
    lavender: '#EBEBE4',       // Secondary concrete surface
    lavenderDeep: '#DCDCD2',
    decorGreen: '#00B86B',
    pastelLilac: '#EDEBF9',
    pastelBlue: '#E5EEFF',
    pastelMint: '#E3F6EC',
    pastelPeach: '#FFEFE5',
    pastelRose: '#FFE8E5',
    pastelSand: '#FBF6DF',
  },
  today: {
    ink: '#111318',
    muted: '#60636B',
    mint: '#009E60',
    highlightSoft: '#FFFCE0',
    ringSize: 132,
  },
  dark: {
    ink: '#F2F2EE',
    text: '#E6E6E1',
    onPrimary: '#0A0B0E',
    paper: '#0D0E11',          // Matte anodized black
    surface: '#16181D',        // Dark machined aluminum
    border: '#2A2D36',         // Steel border
    muted: '#9498A3',
    violet: '#4D88FF',         // Electric cobalt
    mint: '#2EE59D',           // Neon mint
    mintText: '#2EE59D',
    blue: '#5CA8FF',
    amber: '#FFB020',
    rose: '#FF6B52',           // Luminous vermilion
    teal: '#33D6E0',
    highlighter: '#FFE600',
    highlightSoft: '#3D380A',
    tonalPrimary: '#16264C',
    tonalSuccess: '#123829',
    lavender: '#1D2026',
    lavenderDeep: '#262A33',
    decorGreen: '#2EE59D',
    pastelLilac: '#26243B',
    pastelBlue: '#182742',
    pastelMint: '#143829',
    pastelPeach: '#3B261A',
    pastelRose: '#3D1E1A',
    pastelSand: '#383314',
  },
  layout: {
    navWidth: 244,
    topBarHeight: 72,
    bottomNavHeight: 72,
    taskRail: 290,
    contentMax: 1460,
    writingCanvasHeight: 'clamp(9rem, calc(100dvh - 32rem), 30rem)',
    writingCanvasMobileHeight: 'clamp(10rem, 35dvh, 20rem)',
    readSweepDuration: 2400,
    readSweepStagger: 100,
    feedbackCanvasMinHeight: 480,
    feedbackSheetRadius: 24,
    ringSize: 132,
  },
  radius: { unit: 4, sm: 8, md: 10, lg: 12, sheet: 24, pill: 999 },
  shadow: {
    card: '0 4px 24px -16px rgba(17, 19, 24, 0.10)',
    raised: '0 14px 36px -20px rgba(17, 19, 24, 0.20)',
    header: '0 20px 48px -38px rgba(17, 19, 24, 0.40)',
  },
} as const;
