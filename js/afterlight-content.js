// Original fiction for the optional AFTERLIGHT experience. Professional facts
// belong to the independent portfolio journal, not this imagined universe.
export const DESTINATIONS = {
  observatory: {
    title: 'The listening sky',
    eyebrow: '01 / The Observatory',
    intro: 'Someone left a telescope pointed at an empty patch of sky. The receiver is still warm.',
    description: 'Align three orbital rings, look through the telescope, and search the island for messages that should have gone quiet years ago. There is no hurry. Even light takes the long way here.',
    hint: 'Each dial has eight positions. Match inner 3, middle 6, outer 2, then visit the telescope.',
  },
  chronos: {
    title: 'A minute out of place',
    eyebrow: '02 / The Time Garden',
    intro: 'One island. Two moments. Yesterday left you a bridge; today left you something to find.',
    description: 'Step between yesterday and today. Cross the old bridge while it still exists, reach the far bank, then return to the present to find the time shard. Some paths take more than distance.',
    hint: 'Choose yesterday to cross. Reach solid ground on the far bank before returning to today.',
  },
  resonance: {
    title: 'Make a little noise',
    eyebrow: '03 / The Resonance Room',
    intro: 'A drum machine has been waiting a very long time for somebody to press the wrong button.',
    description: 'Wake the room with four chimes, then build a loop on the pocket orchestra. Change the rhythm, let it breathe, or make a glorious mess. This room is an instrument.',
    hint: 'Play moon, wave, star, sun: first, third, second, fourth. The pocket orchestra is a separate instrument; its four rows are yours to play.',
  },
  cinema: {
    title: 'The last picture house',
    eyebrow: '04 / The Midnight Cinema',
    intro: 'Three films. No trailers. The projectionist has saved you the best seat.',
    description: 'An observatory becomes a cinema after dark. Watch tiny original films made from light, motion, and a few words. Stay through the final frame; it belongs to the story.',
    hint: 'Visit the projector to choose a film. Watch each reel to its last frame, then explore the island for three archive fragments.',
  },
};

export const DISCOVERIES = {
  'observatory-1': {
    title: 'The wrong number',
    eyebrow: 'Received / 03:17 / Origin unknown',
    kind: 'Radio fragment',
    text: [
      'The first signal is not a distress call. Someone asks if you remembered to bring the bread. There is a pause, the scrape of a chair, and laughter close to the microphone. Behind it, rain is hitting a metal roof.',
      'You check the coordinates. The transmission comes from a star that is no longer there. The archive has filed it under EQUIPMENT ERROR. You listen again. Two people are arguing, very gently, about whether the bread matters. You change the label to DINNER. The receiver stops blinking red.',
    ],
    thought: 'Not every signal needs to save the universe.',
    fragment: 'S',
  },
  'observatory-2': {
    title: 'A postcard with no front',
    eyebrow: 'Recovered / Deep field 08',
    kind: 'Unsent postcard',
    text: [
      'A rectangle of pale light floats into the receiver. On one side: nothing. On the other: “You would hate the coffee here. You would love everything else.” There is no signature, only a tiny drawing of a planet wearing a scarf.',
      'The archive offers to reconstruct the missing photograph. You decline. For a moment the telescope shows a kitchen window, a crowded train, a sea at night. None of these pictures lasts long enough to keep. Perhaps the sender could not choose either. You leave the front blank and put the postcard where the next keeper will find it.',
    ],
    thought: 'Some places are incomplete until you tell someone about them.',
    fragment: 'T',
  },
  'observatory-3': {
    title: 'Please do not fix this',
    eyebrow: 'Maintenance note / Telescope 04',
    kind: 'Keeper’s annotation',
    text: [
      'The telescope has a small fault. Once every hundred rotations, it drifts toward the same unremarkable balcony. A plant. Two empty cups. A very ordinary patch of sky. Several keepers have calibrated the fault out. It always returns.',
      'Under the focus wheel you find a handwritten note: “I used to stand there and wonder who was looking back.” The handwriting matches the original lens maker’s signature. You leave the adjustment screw alone. Before returning to its route, the telescope lingers for one extra second. The plant has grown.',
    ],
    thought: 'Calibration can wait one second.',
    fragment: 'A',
  },
  'chronos-1': {
    title: 'The thirteen-second Tuesday',
    eyebrow: 'Temporal incident / No action required',
    kind: 'Loop fragment',
    text: [
      'A spoon falls. A hand catches it. A spoon falls. A hand catches it. The garden has been repeating these thirteen seconds since Tuesday. Nobody has agreed which Tuesday.',
      'You turn the clock back a fraction further. Now you can hear the joke that made the hand miss in the first place. It is an awful joke. Something about a planet needing space. The person telling it laughs before the punchline, which improves it considerably. You let the next loop finish. This time the spoon reaches the floor. Somewhere, someone finally gets to tell a second joke.',
    ],
    thought: 'An imperfect next moment is still a next moment.',
    fragment: 'Y',
  },
  'chronos-2': {
    title: 'Open yesterday',
    eyebrow: 'Parcel 002 / Delivery date disputed',
    kind: 'Time capsule',
    text: [
      'Inside a tin beneath the clock: a cinema ticket, a snapped guitar string, and a key with no label. A note reads, “If you have become terribly serious, remember that we meant to have fun.” It is addressed to the person opening the tin.',
      'You wind the garden forward. Rust creeps over the lid, then retreats as you wind it back. The note stays exactly the same. Its final line was added in a different pen: “Also, the key is for the cupboard. We spent three weeks being mysterious about a cupboard.” You put everything back, including the string.',
    ],
    thought: 'The future can contain a very old joke.',
    fragment: 'C',
  },
  'chronos-3': {
    title: 'The hour nobody claimed',
    eyebrow: 'Archive gap / Duration: one evening',
    kind: 'Unscheduled hour',
    text: [
      'An hour has slipped between two numbered pages. Nothing useful happened in it. No ships arrived. No discoveries were made. Someone lay on the warm floor and listened to an album all the way through.',
      'The archive cannot decide where to put it. WORK rejects it. TRAVEL finds no movement. ACHIEVEMENTS asks for evidence. You try a new shelf: WORTH KEEPING. The hour fits perfectly. As you close the drawer, you hear the quiet click between two tracks. For a moment the whole garden waits with you for the next song.',
    ],
    thought: 'A day does not have to produce anything to belong to you.',
    fragment: 'U',
  },
  'resonance-1': {
    title: 'The beat under the floor',
    eyebrow: 'Found sound / Service corridor',
    kind: 'Percussion sample',
    text: [
      'The low thump in the machine is not a drum. It is a loose panel in the old night train. A passenger recorded it because it matched the song in their headphones, then missed their stop while adjusting the recording level.',
      'The next sample is a station announcement swallowed by static. The one after that is a laugh. You put the sounds together, and the train seems to start moving beneath the room. The archive asks for the instrument’s name. You type ACCIDENT. It asks for the performer. You leave enough space for everyone on board.',
    ],
    thought: 'The world has been making a mixtape without asking.',
    fragment: 'R',
  },
  'resonance-2': {
    title: 'The missing note',
    eyebrow: 'Composition / Revision 38',
    kind: 'Unfinished melody',
    text: [
      'Thirty-seven versions of a melody are stored in the room. Each has one more note than the last. The final version has none. Its author has left a message: “I think I filled up all the interesting bits.”',
      'You play the empty version. There is a chair creaking, a breath, and a bird outside. You add a single note. The bird answers, badly, but with confidence. You save the result as version thirty-eight. The archive complains that the timing is irregular. The bird does not appear concerned. Neither, after a while, do you.',
    ],
    thought: 'Leave something for the room to play.',
    fragment: 'I',
  },
  'resonance-3': {
    title: 'For whoever is still awake',
    eyebrow: 'Broadcast / Repeat until sunrise',
    kind: 'Night transmission',
    text: [
      'The last tape has no track list. Its sleeve says, “For the driver. For the person on the late shift. For the one who could not sleep. For whoever is still awake.” Someone has drawn a small lighthouse in the corner.',
      'A patient bass line begins. Nothing dramatic follows. No announcement, no message from another world. Just enough rhythm to make the dark feel occupied. You notice that your new loop fits over it. Different room, different night, same small gesture. You leave the transmitter running and turn the volume down a little.',
    ],
    thought: 'Sometimes keeping someone company is the whole song.',
    fragment: 'O',
  },
  'cinema-1': {
    title: 'The seat beside you',
    eyebrow: 'Reel 01 / SIGNAL',
    kind: 'Projectionist’s note',
    text: [
      'There is a ticket tucked into the seat beside you. Seat 07. Row forever. The film has been screened to an empty room on every clear night since the projectionist left. A note on the booth door says, “Someone might arrive late.”',
      'You look back at the screen. The distant point of light is smaller than a subtitle. It blinks once. Across the dark, another point answers. That is the entire film. The projectionist’s final instruction is written beneath the lens: “Do not make the lights brighter. They are already finding each other.”',
    ],
    thought: 'A reply can be very small and still change the night.',
    fragment: 'U',
  },
  'cinema-2': {
    title: 'A different way around',
    eyebrow: 'Reel 02 / ORBIT',
    kind: 'Discarded ending',
    text: [
      'The original ending was spectacular. Two moons collided. There were sparks, a huge flash, and an expensive-looking cloud. The editor wrote one word in the margin: “Why?” The next cut gives the moons a little more room.',
      'You watch them pass, narrowly, then settle into separate paths. On the next orbit their shadows briefly overlap. Neither has to disappear. In a drawer beneath the projector you find a jar marked UNUSED EXPLOSION. The lid rattles when you touch it. You put it back carefully. Some other film may need it one day.',
    ],
    thought: 'An ending can be quiet without being small.',
    fragment: 'S',
  },
  'cinema-3': {
    title: 'After the credits',
    eyebrow: 'Reel 03 / HOME',
    kind: 'Final frame',
    text: [
      'The credits finish. You stay. For several seconds there is only an empty window. Then a light switches on, a hand appears, and a plant is moved a little closer to the glass. The same balcony the telescope keeps returning to.',
      'You open the archive’s oldest record. Its purpose was never to collect the loudest things in the universe. It was built to keep the things someone would miss: a bad joke, a half-finished tune, a window lit for a late arrival. The final frame holds. Somewhere beyond it, a kettle begins to boil.',
    ],
    thought: 'You were not collecting distant worlds. You were finding the way home.',
    fragment: '!',
  },
};

export const FILM_SCRIPTS = [
  {
    id: 'signal',
    title: 'SIGNAL',
    subtitle: 'A very small conversation across a very large dark.',
    credits: 'An original procedural short · AFTERLIGHT',
    duration: 24,
    scenes: [
      { at: 0, title: '01 / Somewhere', line: 'One light. Nobody to wave to.' },
      { at: 6, title: '02 / A small attempt', line: 'It blinked anyway.' },
      { at: 12, title: '03 / The long wait', line: 'The dark took its time.' },
      { at: 18, title: '04 / Elsewhere', line: 'Then somebody blinked back.' },
    ],
  },
  {
    id: 'orbit',
    title: 'ORBIT',
    subtitle: 'Two moons learn a less dramatic ending.',
    credits: 'An original procedural short · AFTERLIGHT',
    duration: 24,
    scenes: [
      { at: 0, title: '01 / Approach', line: 'They had always taken the same path.' },
      { at: 6, title: '02 / Almost', line: 'This time, there was somebody else on it.' },
      { at: 12, title: '03 / A little room', line: 'One moved closer. One moved out.' },
      { at: 18, title: '04 / Again', line: 'Now every orbit had a hello.' },
    ],
  },
  {
    id: 'home',
    title: 'HOME',
    subtitle: 'The universe, seen from a kitchen window.',
    credits: 'An original procedural short · AFTERLIGHT',
    duration: 24,
    scenes: [
      { at: 0, title: '01 / Out there', line: 'A billion places to be.' },
      { at: 6, title: '02 / Closer', line: 'One familiar window.' },
      { at: 12, title: '03 / Evening', line: 'Someone had left the light on.' },
      { at: 18, title: '04 / Still here', line: 'There was room for one more cup.' },
    ],
  },
];

export const WORLD_IDEAS = {
  framing: 'These are design ideas interpreted from requests for meaningful choices, continuity and balanced sound. They describe this fictional world, not personal traits, delivered projects or biography.',
  entries: [
    { id: 'choices', title: 'Choices have a history', line: 'Yesterday keeps a bridge that today has lost. The Time Garden makes a change in context alter the paths you can take.', destination: 'chronos' },
    { id: 'context', title: 'A context worth keeping', line: 'A discovery should survive your departure. The atlas keeps found stories and your pocket-orchestra loop in this browser so you can return to something familiar.', destination: 'observatory' },
    { id: 'listening', title: 'Room to listen', line: 'Sound is optional, and the room is yours to shape. Build a balanced little loop, leave space between its notes, and hear what your changes do.', destination: 'resonance' },
  ],
};

export const SECRETS = {
  code: 'STAYCURIOUS!',
  title: 'The archive was never empty.',
  text: 'Twelve signals. One message: stay curious. You kept the ordinary things, made a little noise, and stayed through the credits. The next keeper will find your light already on. Thank you for spending part of your universe here.',
  signature: 'End of transmission. Beginning of whatever comes next.',
};
