"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualRegion = actualRegion;
const regionOffsets = [
    [0, 0],
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
];
function actualRegion(x, y) {
    return regionOffsets.map(([dx, dy]) => [x + dx, y + dy]);
}
