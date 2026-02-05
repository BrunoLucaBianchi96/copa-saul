export interface Soundbite {
  path: string
  offset?: number // offset in milliseconds
  volume?: number // volume multiplier (default 1)
}

export interface Soundbites {
  onBan?: Soundbite // plays when a game is banned
  onPick?: Soundbite // plays when a game is picked
  onGameSelected?: Soundbite // plays when the final game to play is selected
  onWinnerChosen?: Soundbite // plays when the match winner is chosen
}

export interface Theme {
  id: string
  name: string
  bpm: number
  division: number // 2 = binary, 3 = ternary, 4 = quaternary (bounces per sway)
  audioFile?: string // path to audio file in public folder
  audioOffset?: number // offset in milliseconds to start audio from
  normalizeVolume?: number // multiplier to normalize volume across themes (default 1)
  soundbites?: Soundbites // optional soundbites that play at different stages
  backgroundImage?: string // URL or path to background image
  backgroundSize?: 'cover' | 'contain' | 'repeat' // how to size the background (default: cover)
}

export const THEMES: Theme[] = [
  {
    id: 'matrix',
    name: 'Spybreak! (The Matrix)',
    bpm: 128,
    division: 1,
    audioFile: '/songs/matrix-spybreak.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp1917057.jpg',
  },
  {
    id: 'raising-fighting-spirit',
    name: 'The Raising Fighting Spirit',
    bpm: 140,
    division: 1,
    audioFile: '/songs/naruto.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp8813234.png',
    soundbites: {
      onGameSelected: { path: '/soundbites/yooooooooooo.mp3', offset: 6200, volume: 0.2 },
    },
  },
  {
    id: 'techno-syndrome',
    name: 'Techno Syndrome',
    bpm: 134,
    division: 1,
    audioFile: '/songs/techno-syndrome.mp3',
    normalizeVolume: 0.5,
    backgroundImage: 'https://cdna.artstation.com/p/assets/images/images/003/714/696/large/pawel-kot-mk2-hd-armory.jpg?1476740914',
    soundbites: {
      onGameSelected: { path: '/soundbites/MORTAL KOMBAT! Scream.mp3', offset: 100, volume: 0.2 },
      onWinnerChosen: { path: '/soundbites/Fatality - Mortal Kombat Sound Effect (HD).mp3', volume: 0.2 },
    },
  },
  {
    id: 'melee-character-select',
    name: 'SSBM Character Select',
    bpm: 154,
    division: 1,
    audioFile: '/songs/melee-character-select.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://ssb.wiki.gallery/images/thumb/8/86/SSBU-Battlefield.png/1200px-SSBU-Battlefield.png',
  },
  {
    id: 'age-of-empires-2',
    name: 'Age of Empires 2 Theme',
    bpm: 65,
    division: 1,
    audioFile: '/songs/age-of-empires-2.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://pbs.twimg.com/media/EIjXBAsXkAMbUsk.jpg',
    soundbites: {
      onGameSelected: { path: '/soundbites/Wololo Sound Effect.mp3' },
    },
  },
  {
    id: 'ultimate-battle',
    name: 'Ultimate Battle (Dragon Ball Super)',
    bpm: 170,
    division: 1,
    audioFile: '/songs/ultimate-battle.mp3',
    normalizeVolume: 1,
    audioOffset: 2000,
    backgroundImage: 'https://pbs.twimg.com/media/FgVivkzVQAEkuTK.jpg',
    backgroundSize: 'repeat',
  },
  {
    id: 'perfect-cell-theme',
    name: 'Perfect Cell Theme',
    bpm: 100,
    division: 1,
    audioFile: '/songs/perfect-cell-theme.mp3',
    audioOffset: 9000,
    normalizeVolume: 1,
    backgroundImage: 'https://i.redd.it/i66bdvdl1h561.jpg',
  },
  {
    id: 'guiles-theme',
    name: "Guile's Theme",
    bpm: 125,
    division: 1,
    audioFile: '/songs/guiles-theme.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://www.arcadequartermaster.com/ssf2/bonus1.png',
    soundbites: {
      onBan: { path: '/soundbites/Shoryuken - Sound Effect.mp3', offset: 250 },
      onPick: { path: '/soundbites/hadouken sound effect.mp3' },
    },
  },
  {
    id: 'stardust-crusaders',
    name: "Jotaro's Theme (JoJo)",
    bpm: 140,
    division: 2,
    audioFile: '/songs/stardust-crusaders.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapers.com/images/hd/stardust-crusaders-1920-x-1080-wallpaper-d675thhdqigslk2g.jpg',
    soundbites: {
      onGameSelected: { path: '/soundbites/Za Warudo - Sound Effect.mp3', volume: 0.6},
      onWinnerChosen: { path: '/soundbites/Yare Yare Daze.mp3', volume: 5 },
    },
  },
  {
    id: 'overtaken',
    name: 'Overtaken (One Piece)',
    bpm: 107,
    division: 1,
    audioFile: '/songs/overtaken.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp11199297.png',
  },
  {
    id: 'red-sun',
    name: 'Red Sun (MGRR)',
    bpm: 150,
    division: 1,
    audioFile: '/songs/mgrr-red-sun.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://images6.alphacoders.com/388/thumb-1920-388347.jpg',
  },
  {
    id: 'elden-ring',
    name: 'Elden Ring Main Theme',
    bpm: 75,
    division: 1,
    audioFile: '/songs/elden-ring-main-menu.mp3',
    audioOffset: 23000,
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/uwp/uwp4431208.png',
  },
  {
    id: 'megalovania',
    name: 'Megalovania (Undertale)',
    bpm: 120,
    division: 1,
    audioFile: '/songs/megalovania.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp15821690.png',
  },
  {
    id: 'gta-4',
    name: 'Soviet Connection (GTA IV)',
    bpm: 72,
    division: 1,
    audioFile: '/songs/gta-4.mp3',
    normalizeVolume: 1,
  },
  {
    id: 'wii-sports',
    name: 'Wii Sports Theme',
    bpm: 120,
    division: 1,
    audioFile: '/songs/wii-sports.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://s1.thcdn.com/design-assets/products/Large/10456603/pic1.jpg',
  },
  {
    id: 'scarface-push-it-to-the-limit',
    name: 'Push It to the Limit (Scarface)',
    bpm: 122,
    division: 1,
    audioFile: '/songs/Scarface-push-it-to-the-limit.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp2073053.jpg',
  },
]

export function getThemeById(id: string): Theme | undefined {
  return THEMES.find((t) => t.id === id)
}

// Get theme for a specific match in a tournament (cycles through themes in order, no repeats until all used)
export function getThemeForTournament(_tournamentId: number, matchIndex: number): Theme {
  return THEMES[matchIndex % THEMES.length]
}

// Calculate animation durations based on BPM and division
export function getAnimationDurations(theme: Theme): { bounce: number; sway: number } {
  const beatDuration = 60 / theme.bpm
  const swayDuration = beatDuration * 6 // sway lasts for 6 beats
  return {
    bounce: beatDuration / theme.division, // divide sway by division for bounce count
    sway: swayDuration,
  }
}
