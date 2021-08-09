"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var animals = [
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
function randomAnimal() {
    return animals[Math.round(Math.random() * animals.length)];
}
exports.default = randomAnimal;
