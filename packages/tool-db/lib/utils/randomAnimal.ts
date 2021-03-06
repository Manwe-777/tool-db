const adjectives = [
  "Fast",
  "Slow",
  "Cute",
  "Evil",
  "Anxious",
  "Cursed",
  "Average",
  "Zombie",
  "Smart",
  "Small",
  "Tall",
  "Amazing",
  "Splendid",
  "Fat",
  "Invisible",
  "Regular",
  "Domestic",
  "Unique",
  "Soft",
  "Lazy",
  "Angry",
  "Relaxed",
  "Huge",
  "Shy",
  "Playful",
  "Creepy",
  "Ancient",
  "Beautiful",
];

const animals = [
  "Snake",
  "Monkey",
  "Platypus",
  "Fox",
  "Lynx",
  "Pug",
  "Chicken",
  "Slug",
  "Snail",
  "Pig",
  "Cow",
  "Sheep",
  "Horse",
  "Squirrel",
  "Turtle",
  "Unicorn",
  "Dragon",
  "Dolphin",
  "Cat",
  "Chow Chow",
  "Elephant",
  "Meerkat",
  "Polar Bear",
  "Bear",
  "Rabbit",
  "Koala",
  "Parrot",
  "Raven",
  "Frog",
  "Rat",
  "Mouse",
  "Bee",
  "Tiger",
  "Lion",
  "Giraffe",
  "Ant",
  "Spider",
  "Zebra",
];

export default function randomAnimal() {
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${
    animals[Math.floor(Math.random() * animals.length)]
  }`;
}
